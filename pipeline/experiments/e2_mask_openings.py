# E2 · Hide one door or window in a BFS subgraph and predict it back: class, type, host wall and place along the wall.
# Needs numpy and torch (CPU). Reads out/source.json and E1's graph.json; writes out/experiments/e2-mask-openings/.
#
# - Three folds by level: each storey is the test once, the other two train. Training subgraphs are cut again by BFS on
#   the graph without the test storey's doors and windows, so no test answer is ever seen, not even as context.
# - Test samples are E1's subgraphs that hold a test door or window; that element is hidden (only its level is kept) and
#   the other elements stay visible ("one by one"). An element sits in several subgraphs; its prediction averages them.
# - The model is a small graph transformer over the subgraph's nodes: each node is its tokens (class, type, level and top
#   level relative to the hidden element) plus its coordinates relative to the piece's centre, rotated and mirrored at
#   random while training (as Hornung et al. 2025). Relations enter as a learned attention bias per kind. The hidden
#   node points at its host among the walls of the piece and gives its place along it, so the result sits on the wall line.
# - Two baselines on the same folds and the same walls: frequency (the most common type, on the wall type that hosts
#   most often, at the middle of the wall) and copy (the training-storey door or window nearest to a candidate wall,
#   projected onto it: the "copied from another floor" answer).
import datetime, json, math, os, random, sys, time
from collections import Counter, defaultdict, deque

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
E1 = os.path.join(OUT, 'experiments', 'e1-tokens-bfs')
EXP = os.path.join(OUT, 'experiments', 'e2-mask-openings')
FT = 0.3048
SUBGRAPH = 20
SEED = 0
D, HEADS, LAYERS = 64, 4, 3
EPOCHS, BATCH, LR = 80, 32, 1e-3
SCALE = 20.0  # metres per unit for coordinates fed to the network
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.set_num_threads(4)

src = json.load(open(os.path.join(OUT, 'source.json'), encoding='utf-8'))
graph = json.load(open(os.path.join(E1, 'graph.json'), encoding='utf-8'))
level_names = [l['name'] for l in sorted(src['levels'], key=lambda l: l['elevation'])]
level_z = {l['name']: l['elevation'] * FT for l in src['levels']}
m = lambda p: [c * FT for c in p]
tname = lambda t: ' | '.join(t)

E = {}
for w in src['walls']:
    z0 = level_z[w['base_level']] + w['base_offset'] * FT
    E[w['id']] = {'cls': 'wall', 'type': tname(w['type']), 'level': w['base_level'], 'top': w['top_level'],
                  'p0': m(w['curve']['p'][0])[:2], 'p1': m(w['curve']['p'][-1])[:2], 'z0': z0,
                  'z1': z0 + w['height'] * FT}
for f in src['floors']:
    pts = [m(c['p'][0]) for c in f['loops'][0]]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    E[f['id']] = {'cls': 'floor', 'type': tname(f['type']), 'level': f['level'], 'top': None,
                  'box': [min(xs), min(ys), max(xs), max(ys)], 'z0': pts[0][2], 'z1': pts[0][2],
                  'area': f['area'] * FT * FT}
for cls, key in (('door', 'doors'), ('window', 'windows')):
    for x in src[key]:
        p = m(x['point'])
        E[x['id']] = {'cls': cls, 'type': tname(x['type']), 'level': x['level'], 'top': None, 'pt': p[:2],
                      'z0': p[2], 'z1': p[2], 'sill': x['sill'] * FT, 'host': x['host']}
for r in src['rooms']:
    p = m(r['point'])
    E[r['id']] = {'cls': 'room', 'type': 'Room | ' + r['name'], 'level': r['level'], 'top': None, 'pt': p[:2],
                  'z0': p[2], 'z1': p[2], 'area': r['area'] * FT * FT}
OPEN = [i for i, e in E.items() if e['cls'] in ('door', 'window')]


def centre(e):
    if e['cls'] == 'wall':
        return [(e['p0'][0] + e['p1'][0]) / 2, (e['p0'][1] + e['p1'][1]) / 2]
    if e['cls'] == 'floor':
        b = e['box']
        return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]
    return e['pt']


def project(pt, w):
    (ax, ay), (bx, by) = w['p0'], w['p1']
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((pt[0] - ax) * vx + (pt[1] - ay) * vy) / L2))
    return t, [ax + t * vx, ay + t * vy]


def seg_dist(pt, w):
    return math.dist(pt, project(pt, w)[1])


KIND = {'joins': 1, 'meets_floor': 2, 'on_floor': 3, 'hosted_by': 4}
EDGE = {}
ADJ = defaultdict(set)
for ed in graph['edges']:
    if ed['kind'] in KIND:
        a, b = ed['a'], ed['b']
        EDGE[(a, b)] = EDGE[(b, a)] = KIND[ed['kind']]
        ADJ[a].add(b)
        ADJ[b].add(a)


def bfs(seed, banned):
    c = centre(E[seed])
    seen, order, q = {seed}, [seed], deque([seed])
    while q and len(order) < SUBGRAPH:
        n = q.popleft()
        for nb in sorted(ADJ[n] - seen - banned, key=lambda k: (math.dist(centre(E[k]), c), k)):
            if len(order) >= SUBGRAPH:
                break
            seen.add(nb)
            order.append(nb)
            q.append(nb)
    return order


E1_SUBGRAPHS = [s['nodes'] for s in json.load(open(os.path.join(E1, 'subgraphs.json'), encoding='utf-8'))]


# -------------------------------------------------------------------------------------------------------------- encoding
CLS = {'pad': 0, 'mask': 1, 'wall': 2, 'floor': 3, 'door': 4, 'window': 5, 'room': 6}
LVL = lambda name, ref: 0 if name is None else 3 + level_names.index(name) - level_names.index(ref)  # 1..7, 0 = none
NFEAT = 9


def encode(nodes, target, type_ids, rot=0, mirror=False):
    """nodes: context ids (target excluded). Returns tensors for one sample; the hidden node is index 0."""
    ref = E[target]['level']
    cx = np.mean([centre(E[n])[0] for n in nodes])
    cy = np.mean([centre(E[n])[1] for n in nodes])
    zr = level_z[ref]

    def tf(p):
        x, y = (p[0] - cx) / SCALE, (p[1] - cy) / SCALE
        if mirror:
            x = -x
        for _ in range(rot):
            x, y = -y, x
        return [x, y]

    cls, typ, lvl, top, feat = [CLS['mask']], [0], [LVL(ref, ref)], [0], [[0.0] * NFEAT]
    for n in nodes:
        e = E[n]
        cls.append(CLS[e['cls']])
        typ.append(type_ids.get(e['type'], 1))
        lvl.append(LVL(e['level'], ref))
        top.append(LVL(e['top'], ref))
        f = [0.0] * NFEAT
        if e['cls'] == 'wall':
            f[0:2], f[2:4] = tf(e['p0']), tf(e['p1'])
        elif e['cls'] == 'floor':
            b = e['box']
            cs = [tf([b[0], b[1]]), tf([b[2], b[3]])]
            f[0:2] = [min(cs[0][0], cs[1][0]), min(cs[0][1], cs[1][1])]
            f[2:4] = [max(cs[0][0], cs[1][0]), max(cs[0][1], cs[1][1])]
            f[6] = math.log(e['area']) / 5
        else:
            f[0:2] = f[2:4] = tf(e['pt'])
            if e['cls'] == 'room':
                f[6] = math.log(max(e['area'], 0.1)) / 5
            else:
                f[7] = e['sill']
        f[4], f[5] = (e['z0'] - zr) / 10, (e['z1'] - zr) / 10
        f[8] = 1.0
        feat.append(f)
    ids = [None] + list(nodes)
    n = len(ids)
    rel = [[0] * n for _ in range(n)]
    for i in range(1, n):
        rel[i][i] = 5
        for j in range(1, n):
            if i != j:
                rel[i][j] = EDGE.get((ids[i], ids[j]), 0)
    rel[0][0] = 5
    return {'cls': cls, 'typ': typ, 'lvl': lvl, 'top': top, 'feat': feat, 'rel': rel, 'ids': ids}


def collate(items):
    N = max(len(it['cls']) for it in items)
    B = len(items)
    out = {k: torch.zeros(B, N, dtype=torch.long) for k in ('cls', 'typ', 'lvl', 'top')}
    out['feat'] = torch.zeros(B, N, NFEAT)
    out['rel'] = torch.zeros(B, N, N, dtype=torch.long)
    out['pad'] = torch.ones(B, N, dtype=torch.bool)
    out['wall'] = torch.zeros(B, N, dtype=torch.bool)
    for b, it in enumerate(items):
        n = len(it['cls'])
        for k in ('cls', 'typ', 'lvl', 'top'):
            out[k][b, :n] = torch.tensor(it[k])
        out['feat'][b, :n] = torch.tensor(it['feat'])
        out['rel'][b, :n, :n] = torch.tensor(it['rel'])
        out['pad'][b, :n] = False
        out['wall'][b, :n] = torch.tensor([c == CLS['wall'] for c in it['cls']])
    return out


# ----------------------------------------------------------------------------------------------------------------- model
class Layer(nn.Module):
    def __init__(self):
        super().__init__()
        self.qkv, self.o = nn.Linear(D, 3 * D), nn.Linear(D, D)
        self.n1, self.n2 = nn.LayerNorm(D), nn.LayerNorm(D)
        self.ff = nn.Sequential(nn.Linear(D, 2 * D), nn.GELU(), nn.Linear(2 * D, D))

    def forward(self, h, bias):
        B, N, _ = h.shape
        q, k, v = self.qkv(self.n1(h)).view(B, N, 3, HEADS, D // HEADS).permute(2, 0, 3, 1, 4)
        att = (q @ k.transpose(-1, -2)) / math.sqrt(D // HEADS) + bias
        h = h + self.o((att.softmax(-1) @ v).transpose(1, 2).reshape(B, N, D))
        return h + self.ff(self.n2(h))


class Net(nn.Module):
    def __init__(self, n_types, n_open):
        super().__init__()
        self.cls, self.typ = nn.Embedding(len(CLS), D), nn.Embedding(n_types, D)
        self.lvl, self.top = nn.Embedding(8, D), nn.Embedding(8, D)
        self.feat = nn.Sequential(nn.Linear(NFEAT, D), nn.GELU(), nn.Linear(D, D))
        self.rel = nn.Embedding(6, HEADS)
        self.layers = nn.ModuleList(Layer() for _ in range(LAYERS))
        self.norm = nn.LayerNorm(D)
        self.head_cls, self.head_type = nn.Linear(D, 2), nn.Linear(D, n_open)
        self.hq, self.hk = nn.Linear(D, D), nn.Linear(D, D)
        self.head_t = nn.Sequential(nn.Linear(2 * D, D), nn.GELU(), nn.Linear(D, 1))

    def forward(self, x):
        h = self.cls(x['cls']) + self.typ(x['typ']) + self.lvl(x['lvl']) + self.top(x['top']) + self.feat(x['feat'])
        bias = self.rel(x['rel']).permute(0, 3, 1, 2)
        bias = bias.masked_fill(x['pad'][:, None, None, :], -1e9)
        for layer in self.layers:
            h = layer(h, bias)
        h = self.norm(h)
        q = h[:, 0]
        host = (self.hk(h) @ self.hq(q)[:, :, None]).squeeze(-1) / math.sqrt(D)
        host = host.masked_fill(~x['wall'], -1e9)
        t = torch.sigmoid(self.head_t(torch.cat([q[:, None].expand_as(h), h], -1))).squeeze(-1)
        return self.head_cls(q), self.head_type(q), host, t


# ----------------------------------------------------------------------------------------------------------------- folds
def sample_targets(test_level):
    test_open = {i for i in OPEN if E[i]['level'] == test_level}
    train, seen = [], set()
    for seed in E:
        if seed in test_open:
            continue
        nodes = bfs(seed, test_open)
        for t in nodes:
            if E[t]['cls'] in ('door', 'window'):
                key = (frozenset(nodes), t)
                if key not in seen:
                    seen.add(key)
                    train.append(([n for n in nodes if n != t], t))
    test, seen = [], set()
    for nodes in E1_SUBGRAPHS:
        for t in nodes:
            if t in test_open:
                key = (frozenset(nodes), t)
                if key not in seen:
                    seen.add(key)
                    test.append(([n for n in nodes if n != t], t))
    return train, test, test_open


def labels(ctx, t):
    e = E[t]
    walls = [i for i, n in enumerate([None] + ctx) if n is not None and E[n]['cls'] == 'wall']
    hi = ([None] + ctx).index(e['host'])
    tt, _ = project(e['pt'], E[e['host']])
    return hi, tt


def run_fold(test_level, log):
    train, test, test_open = sample_targets(test_level)
    train_open = [i for i in OPEN if i not in test_open]
    types = sorted({E[n]['type'] for n in E if n not in test_open})
    type_ids = {t: i + 2 for i, t in enumerate(types)}  # 0 = hidden, 1 = unseen type
    open_types = sorted({E[i]['type'] for i in train_open})
    open_ids = {t: i for i, t in enumerate(open_types)}
    net = Net(len(type_ids) + 2, len(open_types))
    opt = torch.optim.AdamW(net.parameters(), lr=LR, weight_decay=1e-2)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, EPOCHS)
    t0 = time.time()
    for ep in range(EPOCHS):
        random.shuffle(train)
        net.train()
        tot = 0.0
        for b in range(0, len(train), BATCH):
            batch = train[b:b + BATCH]
            items, y_cls, y_typ, y_host, y_t, y_len = [], [], [], [], [], []
            for ctx, t in batch:
                items.append(encode(ctx, t, type_ids, random.randrange(4), random.random() < 0.5))
                hi, tt = labels(ctx, t)
                y_cls.append(int(E[t]['cls'] == 'window'))
                y_typ.append(open_ids[E[t]['type']])
                y_host.append(hi)
                y_t.append(tt)
                w = E[E[t]['host']]
                y_len.append(math.dist(w['p0'], w['p1']))
            x = collate(items)
            pc, pt, ph, ptt = net(x)
            y_host_t = torch.tensor(y_host)
            t_hat = ptt.gather(1, y_host_t[:, None]).squeeze(1)
            loss = (F.cross_entropy(pc, torch.tensor(y_cls)) + F.cross_entropy(pt, torch.tensor(y_typ)) +
                    F.cross_entropy(ph, y_host_t) +
                    (torch.abs(t_hat - torch.tensor(y_t)) * torch.tensor(y_len)).mean() / 2)
            opt.zero_grad()
            loss.backward()
            opt.step()
            tot += loss.item() * len(batch)
        sched.step()
        if ep in (0, EPOCHS - 1):
            log.append('fold %s epoch %d loss %.3f' % (test_level, ep + 1, tot / len(train)))
    secs = time.time() - t0

    # Predict: average every subgraph the element sits in.
    net.eval()
    acc = defaultdict(lambda: {'cls': np.zeros(2), 'typ': np.zeros(len(open_types)), 'host': Counter(),
                               't': defaultdict(list), 'n': 0})
    with torch.no_grad():
        for b in range(0, len(test), BATCH):
            batch = test[b:b + BATCH]
            items = [encode(ctx, t, type_ids) for ctx, t in batch]
            pc, pt, ph, ptt = net(collate(items))
            for k, (ctx, t) in enumerate(batch):
                a = acc[t]
                a['n'] += 1
                a['cls'] += pc[k].softmax(-1).numpy()
                a['typ'] += pt[k].softmax(-1).numpy()
                probs = ph[k].softmax(-1).numpy()
                for i, nid in enumerate(items[k]['ids']):
                    if nid is not None and E[nid]['cls'] == 'wall':
                        a['host'][nid] += float(probs[i])
                        a['t'][nid].append(float(ptt[k, i]))
    sill = sill_by_type(train_open)
    preds = {}
    for t, a in acc.items():
        host = max(a['host'], key=a['host'].get)
        tt = float(np.mean(a['t'][host]))
        w = E[host]
        typ = open_types[int(a['typ'].argmax())]
        preds[t] = {'cls': ['door', 'window'][int(a['cls'].argmax())], 'type': typ, 'host': host,
                    'pt': [w['p0'][0] + tt * (w['p1'][0] - w['p0'][0]), w['p0'][1] + tt * (w['p1'][1] - w['p0'][1])],
                    'sill': sill.get(typ, 0.0), 'subgraphs': a['n'],
                    'host_prob': round(a['host'][host] / a['n'], 3)}
    return preds, {'train_samples': len(train), 'test_samples': len(test), 'test_elements': len(test_open),
                   'train_seconds': round(secs, 1), 'parameters': sum(p.numel() for p in net.parameters())}, \
        test, train_open


def sill_by_type(ids):
    by = defaultdict(list)
    for i in ids:
        by[E[i]['type']].append(E[i]['sill'])
    return {k: float(np.median(v)) for k, v in by.items()}


# ------------------------------------------------------------------------------------------------------------- baselines
def baselines(test, train_open):
    cands = defaultdict(set)
    for ctx, t in test:
        cands[t] |= {n for n in ctx if E[n]['cls'] == 'wall'}
    cls_mode = Counter(E[i]['cls'] for i in train_open).most_common(1)[0][0]
    type_mode = Counter(E[i]['type'] for i in train_open if E[i]['cls'] == cls_mode).most_common(1)[0][0]
    host_types = Counter(E[E[i]['host']]['type'] for i in train_open)
    sill = sill_by_type(train_open)
    freq, copy = {}, {}
    for t, ws in cands.items():
        ws = sorted(ws)
        h = max(ws, key=lambda w: (host_types.get(E[w]['type'], 0), math.dist(E[w]['p0'], E[w]['p1'])))
        _, p = project([(E[h]['p0'][0] + E[h]['p1'][0]) / 2, (E[h]['p0'][1] + E[h]['p1'][1]) / 2], E[h])
        freq[t] = {'cls': cls_mode, 'type': type_mode, 'host': h, 'pt': p, 'sill': sill.get(type_mode, 0.0)}
        d, o, w = min((seg_dist(E[o]['pt'], E[w]), o, w) for o in train_open for w in ws)
        copy[t] = {'cls': E[o]['cls'], 'type': E[o]['type'], 'host': w, 'pt': project(E[o]['pt'], E[w])[1],
                   'sill': E[o]['sill'], 'copied_from': o}
    return freq, copy


# --------------------------------------------------------------------------------------------------------------- metrics
def score(preds, train_open_by_elem):
    errs, errs_host = [], []
    n = len(preds)
    c = Counter()
    copied = 0
    for t, p in preds.items():
        e = E[t]
        c['cls'] += p['cls'] == e['cls']
        c['type'] += p['type'] == e['type']
        c['host'] += p['host'] == e['host']
        d = math.dist(p['pt'], e['pt'])
        errs.append(d)
        if p['host'] == e['host']:
            errs_host.append(d)
        if min(math.dist(p['pt'], E[o]['pt']) for o in train_open_by_elem[t]) <= 0.10:
            copied += 1
    pct = lambda k: round(100 * k / n, 1)
    return {'elements': n, 'class_acc_pct': pct(c['cls']), 'type_acc_pct': pct(c['type']),
            'host_acc_pct': pct(c['host']),
            'position_error_m': {'median': round(float(np.median(errs)), 3), 'mean': round(float(np.mean(errs)), 3)},
            'position_error_when_host_right_m': {'median': round(float(np.median(errs_host)), 3) if errs_host else None},
            'within_1cm': sum(d <= 0.01 for d in errs), 'within_10cm': sum(d <= 0.10 for d in errs),
            'within_50cm': sum(d <= 0.50 for d in errs), 'within_1m': sum(d <= 1.0 for d in errs),
            'within_1cm_type_and_host_right': sum(1 for t, p in preds.items() if p['type'] == E[t]['type'] and
                                                  p['host'] == E[t]['host'] and math.dist(p['pt'], E[t]['pt']) <= 0.01),
            'within_10cm_of_a_training_floor_opening_pct': pct(copied)}


# ------------------------------------------------------------------------------------------------------------------ main
log, folds = [], {}
allp = {'transformer': {}, 'frequency': {}, 'copy': {}}
train_of = {}
test_levels = [l for l in level_names if any(E[i]['level'] == l for i in OPEN)]
for lvl in test_levels:
    preds, info, test, train_open = run_fold(lvl, log)
    freq, copy = baselines(test, train_open)
    for t in preds:
        train_of[t] = train_open
    allp['transformer'].update(preds)
    allp['frequency'].update(freq)
    allp['copy'].update(copy)
    folds[lvl] = {**info, 'transformer': score(preds, {t: train_open for t in preds}),
                  'frequency': score(freq, {t: train_open for t in freq}),
                  'copy': score(copy, {t: train_open for t in copy})}
    print(lvl, json.dumps(folds[lvl]['transformer']), flush=True)

truth_stacked = sum(1 for t in OPEN if min(math.dist(E[t]['pt'], E[o]['pt']) for o in train_of[t]) <= 0.10)
metrics = {k: score(v, train_of) for k, v in allp.items()}
metrics['truth_within_10cm_of_a_training_floor_opening_pct'] = round(100 * truth_stacked / len(OPEN), 1)
mid = [math.dist(E[t]['pt'], project([(E[E[t]['host']]['p0'][k] + E[E[t]['host']]['p1'][k]) / 2 for k in range(2)],
                                     E[E[t]['host']])[1]) for t in OPEN]
metrics['reference_middle_of_true_host_m'] = {'median': round(float(np.median(mid)), 3),
                                              'mean': round(float(np.mean(mid)), 3)}
metrics['folds'] = folds

os.makedirs(EXP, exist_ok=True)
rows = []
for model, preds in allp.items():
    for t, p in sorted(preds.items()):
        e = E[t]
        rows.append({'model': model, 'id': t, 'level': e['level'], 'true': {'cls': e['cls'], 'type': e['type'],
                     'host': e['host'], 'pt_m': [round(c, 4) for c in e['pt']], 'sill_m': round(e['sill'], 4)},
                     'pred': {k: (round(v, 4) if isinstance(v, float) else
                                  [round(c, 4) for c in v] if k == 'pt' else v) for k, v in p.items()}})
json.dump({'units': 'metres', 'rows': rows}, open(os.path.join(EXP, 'predictions.json'), 'w', encoding='utf-8'),
          ensure_ascii=False)
summary = {
    'id': 'e2-mask-openings', 'date': datetime.date.today().isoformat(), 'status': 'done',
    'question': 'Hide one door or window in a BFS subgraph: can a small transformer predict its class, type, host wall '
                'and place, on a storey it never saw?',
    'input': 'pipeline/out/source.json + pipeline/out/experiments/e1-tokens-bfs/',
    'counts': {'doors_and_windows': len(OPEN), 'folds': len(test_levels), 'test_levels': test_levels,
               'train_samples_per_fold': {k: v['train_samples'] for k, v in folds.items()},
               'test_samples_per_fold': {k: v['test_samples'] for k, v in folds.items()},
               'model_parameters_per_fold': {k: v['parameters'] for k, v in folds.items()}, 'epochs': EPOCHS, 'seed': SEED,
               'train_seconds_per_fold': {k: v['train_seconds'] for k, v in folds.items()},
               'torch': torch.__version__},
    'metrics': metrics,
    'notes': [
        'One model only (Autodesk sample), three storeys: a smoke test of the masking step, not a result about '
        'generalisation. One seed.',
        'Folds by storey: the test storey\'s doors and windows never enter training, not even as context.',
        'One element hidden at a time, the rest of its subgraph visible ("one by one"); its level is given.',
        'The host is always inside the subgraph (E1: 100%), so the host is picked among the piece\'s walls (about 15).',
        'Placement sits on the predicted wall line; the sill comes from the predicted type (median of training).',
        'Copy baseline: the nearest door or window of the training storeys, projected onto a candidate wall. '
        'within_10cm_of_a_training_floor_opening_pct measures how much of each answer could be a copy from another '
        'floor; truth_within_10cm_... is the same measure on the real model (stacked openings).',
        'The place along the wall is not learned: with the right host the median error (position_error_when_host_'
        'right_m) is about the same as putting every element at the middle of its true wall '
        '(reference_middle_of_true_host_m). Class, type and host are learned; the place is not.',
        'No element lands within 1 cm, so the 1 cm check of E3 will place none of them exactly; E3 has to judge by host '
        'and type, and by distance bands.',
        'Settings (80 epochs, 3 layers, d=64) were fixed before the run and not tuned on the test storeys.',
        'Not tested: hiding all openings of a piece at once, walls or rooms, hand/facing flip, and more than one model.',
    ],
    'log': log,
}
json.dump(summary, open(os.path.join(EXP, 'summary.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in metrics.items() if k != 'folds'}, indent=1, ensure_ascii=False))
