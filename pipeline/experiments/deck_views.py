# The data the deck's 3D views need for the experiment slides (deck 07, section 04 · Tests), in one committed file:
# out/experiments/deck-views.json. Plain Python 3. Elements use the same format as research-map/scripts/deck-model.mjs
# project() (metres; Revit X, Y in plan, Z up), so model3d.js / pitch-building.js can draw them as they draw model.json.
# Every number comes from the experiments' outputs; nothing is typed in by hand.
import json, math, os, re, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'out'))
EXP = os.path.join(OUT, 'experiments')
FT = 0.3048
EXAMPLE = 152688  # a door on the entry level: host and type right, 3.33 m off (median with the right host: 3.36 m)
load = lambda *p: json.load(open(os.path.join(*p), encoding='utf-8'))
r = lambda v: round(v, 3)


def size_of(t, fallback):
    m = re.search(r'(\d+)\s*x\s*(\d+)\s*mm', (t or [None, ''])[1] or '', re.I)
    return [int(m.group(1)) / 1000, int(m.group(2)) / 1000] if m else fallback


def project(p):
    """Port of deck-model.mjs project(p, { withHost: true })."""
    level = {l['name']: l['elevation'] * FT for l in p['levels']}
    walls = []
    for w in p['walls']:
        a, b = w['curve']['p'][0], w['curve']['p'][-1]
        walls.append({'id': w['id'], 'a': [r(a[0] * FT), r(a[1] * FT)], 'b': [r(b[0] * FT), r(b[1] * FT)],
                      'z': r(level.get(w['base_level'], 0) + w['base_offset'] * FT), 'h': r(w['height'] * FT),
                      'len': r(w['length'] * FT), 'curtain': w['curtain']})
    direction = {}
    for w in walls:
        dx, dy = w['b'][0] - w['a'][0], w['b'][1] - w['a'][1]
        n = math.hypot(dx, dy) or 1
        direction[w['id']] = [r(dx / n), r(dy / n)]

    def opening(o, fallback):
        w, h = size_of(o['type'], fallback)
        return {'id': o['id'], 'p': [r(v * FT) for v in o['point']], 'w': w, 'h': h,
                'dir': direction.get(o['host'], [1, 0]), 'hand': bool(o['hand_flipped']), 'host': o['host']}

    return {'levels': [{'name': l['name'], 'z': r(l['elevation'] * FT)} for l in p['levels']], 'walls': walls,
            'floors': [{'id': f['id'], 'z': r(f['loops'][0][0]['p'][0][2] * FT),
                        'pts': [[r(c['p'][0][0] * FT), r(c['p'][0][1] * FT)] for c in f['loops'][0]]}
                       for f in p['floors']],
            'doors': [opening(o, [0.9, 2.1]) for o in p['doors']],
            'windows': [opening(o, [0.9, 1.2]) for o in p['windows']],
            'rooms': [{'id': x['id'], 'p': [r(v * FT) for v in x['point']], 'a': r(max(x['area'], 0) * FT * FT)}
                      for x in p['rooms']]}


src = load(OUT, 'source.json')
truth_model, pred_model = load(OUT, 'e3-truth.json'), load(OUT, 'e3-transformer.json')
cls = {x['id']: c for k, c in (('walls', 'wall'), ('floors', 'floor'), ('doors', 'door'), ('windows', 'window'),
                               ('rooms', 'room')) for x in src[k]}
openings = {x['id']: x for k in ('doors', 'windows') for x in src[k]}
p_m = lambda pt: [r(v * FT) for v in pt]

# ---------------------------------------------------------------------------------------------------------------- E1
e1 = load(EXP, 'e1-tokens-bfs', 'summary.json')
piece = next(s for s in load(EXP, 'e1-tokens-bfs', 'subgraphs.json') if s['seed'] == EXAMPLE)
tokens = {}
for line in open(os.path.join(EXP, 'e1-tokens-bfs', 'tokens.jsonl'), encoding='utf-8'):
    t = json.loads(line)
    if t['id'] in (EXAMPLE, openings[EXAMPLE]['host']):
        tokens[t['id']] = t['tokens']
view_e1 = {
    'seed': EXAMPLE, 'nodes': piece['nodes'], 'levels': piece['levels'],
    'classes': dict(Counter(cls[n] for n in piece['nodes'])),
    'edges': [{'a': piece['nodes'][i], 'b': piece['nodes'][j], 'kind': k} for i, j, k in piece['edges']],
    'tokens': {str(k): v for k, v in tokens.items()},
    'numbers': {'elements': e1['counts']['elements'], 'vocabulary': e1['counts']['vocabulary'],
                'relations': sum(e1['counts']['edges'].values()), 'relations_from_json': e1['counts']['edges_from_json'],
                'relations_derived': e1['counts']['edges_derived'], 'pieces': e1['counts']['subgraphs'],
                'distinct_pieces': e1['counts']['unique_subgraphs'],
                'pieces_with_door_or_window': e1['counts']['subgraphs_with_door_or_window'],
                'nodes_per_piece_max': e1['metrics']['nodes_per_subgraph']['max']},
}

# ---------------------------------------------------------------------------------------------------------------- E2
e2 = load(EXP, 'e2-mask-openings', 'summary.json')
row = next(x for x in load(EXP, 'e2-mask-openings', 'predictions.json')['rows']
           if x['model'] == 'transformer' and x['id'] == EXAMPLE)
lvl_z = {l['name']: l['elevation'] * FT for l in src['levels']}
m2 = e2['metrics']
view_e2 = {
    'hidden': EXAMPLE, 'piece': [n for n in piece['nodes'] if n != EXAMPLE],
    'true': {'cls': row['true']['cls'], 'type': row['true']['type'], 'host': row['true']['host'],
             'p': p_m(openings[EXAMPLE]['point'])},
    'pred': {'cls': row['pred']['cls'], 'type': row['pred']['type'], 'host': row['pred']['host'],
             'p': [r(row['pred']['pt'][0]), r(row['pred']['pt'][1]), r(lvl_z[row['level']] + row['pred']['sill'])],
             'host_prob': row['pred']['host_prob'], 'subgraphs_averaged': row['pred']['subgraphs']},
    'distance_m': r(math.dist(row['true']['pt_m'], row['pred']['pt'])),
    'class_ok': row['pred']['cls'] == row['true']['cls'], 'type_ok': row['pred']['type'] == row['true']['type'],
    'host_ok': row['pred']['host'] == row['true']['host'],
    'bars_pct': {k: {model: m2[model][k + '_acc_pct'] for model in ('transformer', 'frequency', 'copy')}
                 for k in ('class', 'type', 'host')},
    'numbers': {'elements': m2['transformer']['elements'], 'folds': e2['counts']['folds'],
                'parameters': max(e2['counts']['model_parameters_per_fold'].values()),
                'within_1cm': m2['transformer']['within_1cm'], 'within_1m': m2['transformer']['within_1m'],
                'median_error_host_right_m': m2['transformer']['position_error_when_host_right_m']['median'],
                'middle_of_true_wall_m': m2['reference_middle_of_true_host_m']['median'],
                'stacked_in_real_model_pct': m2['truth_within_10cm_of_a_training_floor_opening_pct']},
}

# ---------------------------------------------------------------------------------------------------------------- E3
e3 = load(EXP, 'e3-mcp-place', 'summary.json')


def e3_view(run):
    placement = {p['id']: p for p in load(EXP, 'e3-mcp-place', 'placement_%s.json' % run)['placed']}
    per = {x['id']: x for x in load(EXP, 'e3-mcp-place', 'per_element.json')[run]}
    slots, links, missing = {}, [], []
    model = truth_model if run == 'truth' else pred_model
    found = {x['id']: x for k in ('doors', 'windows') for x in model[k]}
    for sid, x in sorted(per.items()):
        pl = placement[sid]
        if not x['placed']:
            missing.append({'source_id': sid, 'p': p_m(pl['point_ft']), 'why': x['why'], 'slot': 4})
            continue
        slot = 1 if x['right_host'] and x['same_type'] else 2 if x['right_host'] else 3
        slots[str(pl['new_id'])] = slot
        if run == 'transformer':
            links.append({'source_id': sid, 'true_p': p_m(openings[sid]['point']),
                          'placed_p': p_m(found[pl['new_id']]['point']), 'slot': slot,
                          'distance_m': x['distance_m']})
    count = Counter(slots.values())
    count[4] = len(missing)
    return {'model': 'e3-' + run, 'slots': slots, 'links': links, 'missing': missing,
            'legend': {str(k): count.get(k, 0) for k in (1, 2, 3, 4)},
            'numbers': {k: v for k, v in {**e3['counts'][run], **e3['metrics'][run]}.items()}}


view_e3t, view_e3p = e3_view('truth'), e3_view('transformer')
out = {
    'note': 'Generated by pipeline/experiments/deck_views.py from pipeline/out (experiments E1-E3, 2026-11-17). Metres; '
            'Revit X, Y in plan and Z up; elements in the format of research-map/scripts/deck-model.mjs project().',
    'slots': {'e3': {'1': 'host and type right', '2': 'host right, type wrong', '3': 'host wrong',
                     '4': 'not in the saved model (rolled back by Revit or lost)'}},
    'models': {'source': project(src), 'e3-truth': project(truth_model), 'e3-transformer': project(pred_model)},
    'e1': view_e1, 'e2': view_e2, 'e3_truth': view_e3t, 'e3_transformer': view_e3p,
    'control_rebuild_py': e3['metrics']['control_rebuild_py'],
}
path = os.path.join(EXP, 'deck-views.json')
json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', path, round(os.path.getsize(path) / 1024), 'KB')
print('e1', view_e1['classes'], len(view_e1['edges']), 'edges', view_e1['tokens'])
print('e2', {k: view_e2[k] for k in ('distance_m', 'class_ok', 'type_ok', 'host_ok')}, view_e2['true']['type'], '->',
      view_e2['pred']['type'], view_e2['pred']['host_prob'], view_e2['pred']['subgraphs_averaged'])
print('e3 truth legend', view_e3t['legend'], '| transformer legend', view_e3p['legend'])
