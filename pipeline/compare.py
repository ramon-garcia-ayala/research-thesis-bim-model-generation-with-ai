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
    """Position only: the farthest any outline point is from the other outline (both ways). The area is compared on its
    own (diff.json), as for walls; adding it here once made floors in place with another area count as out of place."""
    p, q = outline(x), outline(y)
    if not p or not q:
        return 1e9
    one_way = lambda s, t: max(min(dist(u, v) for v in t) for u in s)
    return max(one_way(p, q), one_way(q, p))


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


rows, by_id, matched = {}, {}, {}
for cat, gap in (('walls', wall_gap), ('floors', floor_gap), ('doors', point_gap), ('windows', point_gap)):
    xs, ys = a[cat], b[cat]
    pairs = match(xs, ys, gap)
    matched[cat] = (xs, ys, pairs)
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

# Element by element: what did not come back the same, by source id (and rebuilt id when it has a match). Feeds the
# deck's 3D view of the differences.
off = lambda p, q: abs(p - q) / p > 0.01 if p else q > 0
diff = {}
for cat, (xs, ys, pairs) in matched.items():
    found = []
    for i, x in enumerate(xs):
        if i not in pairs:
            found.append({'id': x['id'], 'issue': 'not_in_place'})
            continue
        y = ys[pairs[i]]
        if x['type'] != y['type']:
            found.append({'id': x['id'], 'rebuilt_id': y['id'], 'issue': 'type'})
        if cat in ('walls', 'floors') and off(x['area'] or 0, y['area'] or 0):
            found.append({'id': x['id'], 'rebuilt_id': y['id'], 'issue': 'area', 'source_m2': round((x['area'] or 0) * FT * FT, 2), 'rebuilt_m2': round((y['area'] or 0) * FT * FT, 2)})
        if cat in ('doors', 'windows'):
            if not (x['host'] in by_id['walls'] and by_id['walls'][x['host']] == y['host']):
                found.append({'id': x['id'], 'rebuilt_id': y['id'], 'issue': 'host'})
            if x.get('hand_flipped') != y.get('hand_flipped') or x.get('facing_flipped') != y.get('facing_flipped'):
                found.append({'id': x['id'], 'rebuilt_id': y['id'], 'issue': 'flipped'})
    taken = set(pairs.values())
    found += [{'rebuilt_id': y['id'], 'issue': 'extra'} for j, y in enumerate(ys) if j not in taken]
    diff[cat] = found
xs, ys = a['rooms'], b['rooms']
pairs = match(xs, ys, point_gap)
diff['rooms'] = [{'id': x['id'], 'issue': 'not_in_place'} for i, x in enumerate(xs) if i not in pairs]
diff['rooms'] += [{'id': xs[i]['id'], 'rebuilt_id': ys[j]['id'], 'issue': 'not_enclosed' if ys[j]['area'] <= 0 else 'area',
                   'source_m2': round(xs[i]['area'] * FT * FT, 2), 'rebuilt_m2': round(ys[j]['area'] * FT * FT, 2)}
                  for i, j in pairs.items() if xs[i]['area'] > 0 and off(xs[i]['area'], ys[j]['area'])]
json.dump(diff, open(os.path.join(OUT, 'diff.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
