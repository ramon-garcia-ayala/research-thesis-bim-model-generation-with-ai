# First test of the pipeline. Plain Python: compares out/source.json with out/rebuilt.json and writes out/summary.json.
import json, math, os, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
FT = 0.3048
TOL = 0.01  # metres
load = lambda n: json.load(open(os.path.join(OUT, n), encoding='utf-8'))
a, b = load('source.json'), load('rebuilt.json')


def dist(p, q):
    return math.dist(p, q) * FT


def wall_gap(x, y):
    p, q = x['curve']['p'], y['curve']['p']
    if len(p) != len(q):
        return 1e9
    direct = max(dist(u, v) for u, v in zip(p, q))
    if len(p) >= 2:
        s, t = list(q), list(q)
        t[0], t[1] = q[1], q[0]
        return min(direct, max(dist(u, v) for u, v in zip(p, t)))
    return direct


def outline(f):
    return [pt for loop in f['loops'] for c in loop for pt in c['p']]


def floor_gap(x, y):
    p, q = outline(x), outline(y)
    if not p or not q:
        return 1e9
    centre = lambda s: [sum(v[i] for v in s) / len(s) for i in range(3)]
    return dist(centre(p), centre(q)) + abs((x['area'] or 0) - (y['area'] or 0)) * FT * FT / max((x['area'] or 1) * FT * FT, 1)


def point_gap(x, y):
    return dist(x['point'], y['point'])


def match(xs, ys, gap, tol=TOL):
    """Each source element takes its nearest unused rebuilt element within tolerance."""
    pairs, used = {}, set()
    for i, x in enumerate(xs):
        best, best_d = None, tol
        for j, y in enumerate(ys):
            if j in used:
                continue
            d = gap(x, y)
            if d <= best_d:
                best, best_d = j, d
        if best is not None:
            used.add(best)
            pairs[i] = best
    return pairs


rows, by_id = {}, {}
for cat, gap in (('walls', wall_gap), ('floors', floor_gap), ('doors', point_gap), ('windows', point_gap)):
    xs, ys = a[cat], b[cat]
    pairs = match(xs, ys, gap)
    same_type = sum(1 for i, j in pairs.items() if xs[i]['type'] == ys[j]['type'])
    rows[cat] = {'source': len(xs), 'rebuilt': len(ys), 'same_position': len(pairs), 'same_position_and_type': same_type}
    by_id[cat] = {xs[i]['id']: ys[j]['id'] for i, j in pairs.items()}

la, lb = {l['name']: l['elevation'] for l in a['levels']}, {l['name']: l['elevation'] for l in b['levels']}
rows['levels'] = {'source': len(la), 'rebuilt': len(lb), 'same_position': sum(1 for k, v in la.items() if k in lb and abs(v - lb[k]) * FT <= TOL)}
rows['levels']['same_position_and_type'] = rows['levels']['same_position']

xs, ys = a['rooms'], b['rooms']
pairs = match(xs, ys, point_gap)
placed_a = [r for r in xs if r['area'] > 0]
same_name = sum(1 for i, j in pairs.items() if xs[i]['name'] == ys[j]['name'] and xs[i]['number'] == ys[j]['number'])
area_ok = sum(1 for i, j in pairs.items() if xs[i]['area'] > 0 and abs(xs[i]['area'] - ys[j]['area']) / xs[i]['area'] <= 0.01)
rows['rooms'] = {'source': len(xs), 'rebuilt': len(ys), 'same_position': len(pairs), 'same_position_and_type': same_name,
                 'source_enclosed': len(placed_a), 'rebuilt_enclosed': sum(1 for r in ys if r['area'] > 0), 'same_area_within_1pct': area_ok}

# A relation survived when a door or window kept the wall that corresponds to its original host.
rel = {}
for cat in ('doors', 'windows'):
    src_by_id = {x['id']: x for x in a[cat]}
    new_by_id = {y['id']: y for y in b[cat]}
    ok = 0
    for sid, nid in by_id[cat].items():
        host = src_by_id[sid]['host']
        if host in by_id['walls'] and by_id['walls'][host] == new_by_id[nid]['host']:
            ok += 1
    rel[cat] = {'hosted_in_source': sum(1 for x in a[cat] if x['host'] is not None), 'kept_matching_host': ok}

ext = lambda cat: {k: Counter(str(x.get(k)) for x in a[cat]) for k in ()}
source_flags = {
    'curtain_walls': sum(1 for w in a['walls'] if w['curtain']),
    'edited_profile_walls': sum(1 for w in a['walls'] if w['edited_profile']),
    'non_line_arc_walls': sum(1 for w in a['walls'] if w['curve']['t'] == 'other'),
    'shape_edited_floors': sum(1 for f in a['floors'] if f.get('shape_edited')),
    'wall_phases': Counter(str(w['phase']['created']) for w in a['walls']),
    'room_phases': Counter(str(r['phase']) for r in a['rooms']),
    'door_hosts': Counter(str(d['host_category']) for d in a['doors']),
    'window_hosts': Counter(str(d['host_category']) for d in a['windows']),
}
covered = ['Walls', 'Floors', 'Doors', 'Windows', 'Rooms']
cats = a['model_categories']
total = sum(cats.values())
kept = sum(v for k, v in cats.items() if k in covered)
report = load('rebuild_report.json')
summary = {
    'tolerance_m': TOL, 'rows': rows, 'relations': rel, 'source_flags': source_flags,
    'warnings_source': a['warnings'], 'warnings_rebuilt_file': b['warnings'],
    'phases_source': a['phases'], 'phases_rebuilt': b['phases'],
    'coverage': {'model_elements': total, 'in_tested_categories': kept, 'top_left_out': sorted(((v, k) for k, v in cats.items() if k not in covered), reverse=True)[:12]},
    'failures_by_reason': Counter(f"{f['category']}: {f['why']}" for f in report['failed']).most_common(25),
    'type_copy_failures': report['type_copy_failures'][:20], 'type_copy_failure_count': len(report['type_copy_failures']),
    'revit_messages': sorted(report['revit_messages'].items(), key=lambda kv: -kv[1])[:15],
}
json.dump(summary, open(os.path.join(OUT, 'summary.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
