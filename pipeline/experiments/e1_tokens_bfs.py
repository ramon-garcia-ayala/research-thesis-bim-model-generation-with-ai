# E1 · Tokens + graph + BFS subgraphs. Plain Python 3, standard library only.
# Reads out/source.json and writes out/experiments/e1-tokens-bfs/: tokens.jsonl, graph.json, subgraphs.json, summary.json.
#
# - Every element becomes a short list of tokens: class, type, level, position in bins, size in bins, host.
# - The graph joins door/window -> host wall and element -> level (both read from the JSON), and three relations derived
#   from geometry, because extract.py does not read joins: wall <-> wall (an end touches the other wall), wall <-> floor
#   (the floor's height falls inside the wall and the wall stands on or under the slab outline), room <-> floor (the room
#   point lies inside a slab of its level).
# - Subgraphs of up to 20 nodes are cut by BFS from every element (Hornung et al. 2025). The traversal is constrained:
#   levels are context (given, never hidden, like the site in MaskLayout), so it does not walk through them; inside one
#   ring, the neighbours nearest to the seed come first.
import datetime, json, math, os, sys
from collections import Counter, defaultdict, deque

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out')
EXP = os.path.join(OUT, 'experiments', 'e1-tokens-bfs')
FT = 0.3048           # Revit internal feet -> metres
BIN = 0.5             # metres, position, length and height bins
AREA_STEP = 0.25      # area bins in quarter octaves of m2: one bin is 19% wide
SUBGRAPH = 20         # nodes per subgraph, as Hornung et al. 2025
JOIN_TOL = 0.3        # metres, wall end to the other wall
FLOOR_TOL = 0.5       # metres, wall to slab outline (in plan) and slab height inside the wall's span
Z_TOL = 0.05          # metres

src = json.load(open(os.path.join(OUT, 'source.json'), encoding='utf-8'))
levels = {l['name']: l['elevation'] * FT for l in src['levels']}
m = lambda p: [c * FT for c in p]


# ---------------------------------------------------------------------------------------------------- elements, in metres
def outer_loop(f):
    pts = [m(c['p'][0]) for c in f['loops'][0]]
    return pts


elements = []  # {id, cls, type, level, ...geometry in metres}
for w in src['walls']:
    p0, p1 = m(w['curve']['p'][0]), m(w['curve']['p'][-1])
    z0 = levels[w['base_level']] + w['base_offset'] * FT
    elements.append({'id': w['id'], 'cls': 'wall', 'type': w['type'], 'level': w['base_level'], 'p0': p0, 'p1': p1,
                     'z0': z0, 'z1': z0 + w['height'] * FT, 'length': w['length'] * FT, 'height': w['height'] * FT,
                     'top_level': w['top_level'], 'curtain': w['curtain']})
for f in src['floors']:
    poly = outer_loop(f)
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    elements.append({'id': f['id'], 'cls': 'floor', 'type': f['type'], 'level': f['level'], 'poly': poly,
                     'z': poly[0][2], 'box': [min(xs), min(ys), max(xs), max(ys)], 'area': f['area'] * FT * FT,
                     'corners': len(poly)})
for cls, key in (('door', 'doors'), ('window', 'windows')):
    for x in src[key]:
        elements.append({'id': x['id'], 'cls': cls, 'type': x['type'], 'level': x['level'], 'pt': m(x['point']),
                         'sill': x['sill'] * FT, 'host': x['host']})
for r in src['rooms']:
    elements.append({'id': r['id'], 'cls': 'room', 'type': ['Room', r['name']], 'level': r['level'], 'pt': m(r['point']),
                     'area': r['area'] * FT * FT})
by_id = {e['id']: e for e in elements}


def centre(e):
    if e['cls'] == 'wall':
        return [(e['p0'][i] + e['p1'][i]) / 2 for i in range(2)]
    if e['cls'] == 'floor':
        b = e['box']
        return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]
    return e['pt'][:2]


# ---------------------------------------------------------------------------------------------------------------- tokens
allx = [c for e in elements for c in ([e['p0'][0], e['p1'][0]] if e['cls'] == 'wall' else
                                      [e['box'][0], e['box'][2]] if e['cls'] == 'floor' else [e['pt'][0]])]
ally = [c for e in elements for c in ([e['p0'][1], e['p1'][1]] if e['cls'] == 'wall' else
                                      [e['box'][1], e['box'][3]] if e['cls'] == 'floor' else [e['pt'][1]])]
X0, Y0 = min(allx), min(ally)  # bins count from the model's lower-left corner
qx = lambda v, b=BIN: int(math.floor((v - X0) / b))
qy = lambda v, b=BIN: int(math.floor((v - Y0) / b))
qs = lambda v, b=BIN: int(round(v / b))
qa = lambda a: int(round(math.log2(max(a, 1e-6)) / AREA_STEP))
dx = lambda i, b=BIN: X0 + (i + 0.5) * b
dy = lambda i, b=BIN: Y0 + (i + 0.5) * b


def tokens(e, b=BIN):
    t = ['CLS:' + e['cls'], 'TYPE:' + ' | '.join(e['type']), 'LVL:' + e['level']]
    if e['cls'] == 'wall':
        t += ['X0:%d' % qx(e['p0'][0], b), 'Y0:%d' % qy(e['p0'][1], b), 'X1:%d' % qx(e['p1'][0], b),
              'Y1:%d' % qy(e['p1'][1], b), 'H:%d' % qs(e['height'], b), 'TOP:%s' % e['top_level']]
    elif e['cls'] == 'floor':
        bx = e['box']
        t += ['X0:%d' % qx(bx[0], b), 'Y0:%d' % qy(bx[1], b), 'X1:%d' % qx(bx[2], b), 'Y1:%d' % qy(bx[3], b),
              'AREA:%d' % qa(e['area'])]
    elif e['cls'] in ('door', 'window'):
        t += ['X:%d' % qx(e['pt'][0], b), 'Y:%d' % qy(e['pt'][1], b), 'SILL:%d' % qs(e['sill'], b), 'HOST:wall']
    else:
        t += ['X:%d' % qx(e['pt'][0], b), 'Y:%d' % qy(e['pt'][1], b), 'AREA:%d' % qa(e['area'])]
    return t


def decode_error(e, b):
    """Metres between the true position and the centre of its bin (the worst point of the element)."""
    if e['cls'] == 'wall':
        pts = [e['p0'], e['p1']]
    elif e['cls'] == 'floor':
        pts = [[e['box'][0], e['box'][1]], [e['box'][2], e['box'][3]]]
    else:
        pts = [e['pt']]
    return max(math.dist(p[:2], [dx(qx(p[0], b), b), dy(qy(p[1], b), b)]) for p in pts)


# ----------------------------------------------------------------------------------------------------------------- graph
def seg_dist(p, a, b):
    ax, ay, bx, by, px, py = a[0], a[1], b[0], b[1], p[0], p[1]
    vx, vy = bx - ax, by - ay
    L = vx * vx + vy * vy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / L))
    return math.hypot(px - ax - t * vx, py - ay - t * vy)


def inside(pt, poly):
    x, y, c = pt[0], pt[1], False
    for i in range(len(poly)):
        a, b = poly[i], poly[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            c = not c
    return c


def near_poly(pt, poly, tol):
    return inside(pt, poly) or min(seg_dist(pt, poly[i - 1], poly[i]) for i in range(len(poly))) <= tol


edges = []  # (a, b, kind, origin)
walls = [e for e in elements if e['cls'] == 'wall']
floors = [e for e in elements if e['cls'] == 'floor']
for e in elements:
    edges.append((e['id'], 'level:' + e['level'], 'on_level', 'json'))
    if e['cls'] in ('door', 'window'):
        if e['host'] in by_id:
            edges.append((e['id'], e['host'], 'hosted_by', 'json'))
for i, a in enumerate(walls):
    for b in walls[i + 1:]:
        if a['z0'] > b['z1'] - Z_TOL or b['z0'] > a['z1'] - Z_TOL:
            continue
        ends = [seg_dist(p, b['p0'], b['p1']) for p in (a['p0'], a['p1'])] + \
               [seg_dist(p, a['p0'], a['p1']) for p in (b['p0'], b['p1'])]
        if min(ends) <= JOIN_TOL:
            edges.append((a['id'], b['id'], 'joins', 'derived'))
for w in walls:
    for f in floors:
        if not (w['z0'] - FLOOR_TOL <= f['z'] <= w['z1'] + Z_TOL):
            continue
        mid = [(w['p0'][k] + w['p1'][k]) / 2 for k in range(2)]
        if near_poly(mid, f['poly'], FLOOR_TOL):
            edges.append((w['id'], f['id'], 'meets_floor', 'derived'))
for r in (e for e in elements if e['cls'] == 'room'):
    for f in floors:
        if f['level'] == r['level'] and inside(r['pt'], f['poly']):
            edges.append((r['id'], f['id'], 'on_floor', 'derived'))

adj = defaultdict(set)  # element <-> element only; levels are context, not walked through
for a, b, kind, _ in edges:
    if kind != 'on_level':
        adj[a].add(b)
        adj[b].add(a)


def bfs(seed):
    c = centre(by_id[seed])
    seen, order, q = {seed}, [seed], deque([seed])
    while q and len(order) < SUBGRAPH:
        n = q.popleft()
        for nb in sorted(adj[n] - seen, key=lambda k: (math.dist(centre(by_id[k]), c), k)):
            if len(order) >= SUBGRAPH:
                break
            seen.add(nb)
            order.append(nb)
            q.append(nb)
    return order


subgraphs = []
for e in elements:
    nodes = bfs(e['id'])
    local = {n: i for i, n in enumerate(nodes)}
    inner = [[local[a], local[b], k] for a, b, k, _ in edges if k != 'on_level' and a in local and b in local]
    subgraphs.append({'seed': e['id'], 'nodes': nodes, 'levels': sorted({by_id[n]['level'] for n in nodes}),
                      'edges': inner,
                      'host': {local[n]: local[by_id[n]['host']] for n in nodes
                               if by_id[n]['cls'] in ('door', 'window') and by_id[n]['host'] in local}})


def components():
    seen, sizes = set(), []
    for e in elements:
        if e['id'] in seen:
            continue
        stack, size = [e['id']], 0
        seen.add(e['id'])
        while stack:
            n = stack.pop()
            size += 1
            for nb in adj[n] - seen:
                seen.add(nb)
                stack.append(nb)
        sizes.append(size)
    return sorted(sizes, reverse=True)


# ---------------------------------------------------------------------------------------------------------------- write
os.makedirs(EXP, exist_ok=True)
with open(os.path.join(EXP, 'tokens.jsonl'), 'w', encoding='utf-8') as fh:
    for e in elements:
        fh.write(json.dumps({'id': e['id'], 'cls': e['cls'], 'host': e.get('host'), 'tokens': tokens(e)},
                            ensure_ascii=False) + '\n')
json.dump({'levels': [{'id': 'level:' + k, 'elevation_m': round(v, 4)} for k, v in levels.items()],
           'nodes': [{'id': e['id'], 'cls': e['cls'], 'level': e['level']} for e in elements],
           'edges': [{'a': a, 'b': b, 'kind': k, 'origin': o} for a, b, k, o in edges]},
          open(os.path.join(EXP, 'graph.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(subgraphs, open(os.path.join(EXP, 'subgraphs.json'), 'w', encoding='utf-8'), ensure_ascii=False)

cls_count = Counter(e['cls'] for e in elements)
toks = [tokens(e) for e in elements]
vocab = sorted({t for ts in toks for t in ts})
sizes = [len(s['nodes']) for s in subgraphs]
unique = {frozenset(s['nodes']) for s in subgraphs}
hosted = [s for s in subgraphs if any(by_id[n]['cls'] in ('door', 'window') for n in s['nodes'])]
comp = components()
edge_count = Counter(k for _, _, k, _ in edges)
quant = {}
for b in (0.1, 0.25, 0.5, 1.0):
    errs = [decode_error(e, b) for e in elements]
    quant['bin_%gm' % b] = {'mean_m': round(sum(errs) / len(errs), 3), 'max_m': round(max(errs), 3),
                            'within_1cm': sum(1 for x in errs if x <= 0.01),
                            'vocab': len({t for e in elements for t in tokens(e, b)})}
per_level = defaultdict(Counter)
for e in elements:
    per_level[e['level']][e['cls']] += 1

summary = {
    'id': 'e1-tokens-bfs', 'date': datetime.date.today().isoformat(), 'status': 'done',
    'question': 'Can the 394 elements of the sample be written as tokens and a graph, and cut into ~20-node BFS subgraphs?',
    'input': 'pipeline/out/source.json',
    'counts': {
        'elements': len(elements), 'levels': len(levels), **{c + 's': n for c, n in sorted(cls_count.items())},
        'skipped_by_extract': src.get('skipped', {}),
        'tokens_per_element': {c: len(tokens(next(e for e in elements if e['cls'] == c))) for c in cls_count},
        'vocabulary': len(vocab),
        'types_in_vocabulary': len({t for t in vocab if t.startswith('TYPE:')}),
        'edges': dict(edge_count), 'edges_from_json': sum(1 for *_, o in edges if o == 'json'),
        'edges_derived': sum(1 for *_, o in edges if o == 'derived'),
        'connected_components': len(comp), 'largest_component': comp[0],
        'isolated_elements': sum(1 for s in comp if s == 1),
        'subgraphs': len(subgraphs), 'unique_subgraphs': len(unique),
        'subgraphs_with_20_nodes': sum(1 for s in sizes if s == SUBGRAPH),
        'subgraphs_with_door_or_window': len(hosted),
        'elements_per_level': {k: dict(v) for k, v in sorted(per_level.items())},
    },
    'metrics': {
        'nodes_per_subgraph': {'min': min(sizes), 'mean': round(sum(sizes) / len(sizes), 2), 'max': max(sizes)},
        'levels_per_subgraph_mean': round(sum(len(s['levels']) for s in subgraphs) / len(subgraphs), 2),
        'hosts_inside_subgraph_pct': round(100 * sum(len(s['host']) for s in subgraphs) /
                                           max(1, sum(1 for s in subgraphs for n in s['nodes']
                                                      if by_id[n]['cls'] in ('door', 'window'))), 1),
        'bin_m': BIN, 'quantisation_by_bin': quant,
    },
    'notes': [
        'One model only (Autodesk sample): this is a smoke test of the representation, not a result about learning.',
        'Door/window -> wall and element -> level come from the JSON; wall-wall, wall-floor and room-floor are derived '
        'from geometry (tolerances %.2f m and %.2f m), because extract.py does not read joins or attachments.' % (JOIN_TOL, FLOOR_TOL),
        'Levels are context: subgraphs do not walk through them, so a piece stays local.',
        'Floors are tokenised as their bounding box and area: L-shaped outlines cannot be rebuilt from the tokens.',
        'Door and window size is carried by the type token, not by separate size bins.',
        'Rooms are only a point and an area: no boundaries, no adjacency between rooms.',
        'Subgraphs start at every element, so they overlap; unique_subgraphs counts distinct node sets.',
        'The %d elements outside the largest component are walls on the Roof level (parapets): roofs are not '
        'extracted, so nothing joins them to the rest.' % (len(elements) - comp[0]),
        'Subgraphs cross levels (levels_per_subgraph_mean): exterior walls run from the entry level to the roof and '
        'touch every slab on the way.',
        'Bins lose position: at %.2f m the mean error is %.2f m, never within 1 cm. Placing a prediction for the 1 cm '
        'comparison needs the exact host wall line, not the bin centre.' % (BIN, quant['bin_%gm' % BIN]['mean_m']),
    ],
}
json.dump(summary, open(os.path.join(EXP, 'summary.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
