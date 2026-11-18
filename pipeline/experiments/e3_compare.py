# E3 · Compare the models placed through MCP with the source, at 1 cm as compare.py, and write E3's summary.json.
# Plain Python 3. Needs out/e3-<run>.json, written by extract.py on out/e3/e3-<run>.rvt, and
# out/experiments/e3-mcp-place/placement_<run>.json, written by e3_place_via_mcp.py.
import datetime, json, math, os, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'out'))
EXP = os.path.join(OUT, 'experiments', 'e3-mcp-place')
FT = 0.3048
TOL = 0.01
load = lambda *p: json.load(open(os.path.join(*p), encoding='utf-8'))
sys.path.insert(0, HERE)
from e3_place_via_mcp import wall_map  # noqa: E402  (no MCP call happens on import)

src, rebuilt = load(OUT, 'source.json'), load(OUT, 'rebuilt.json')
to_source = {v: k for k, v in wall_map(src, rebuilt).items()}  # placed models keep the rebuilt wall ids
truth = {x['id']: dict(x, cls=c) for c, k in (('door', 'doors'), ('window', 'windows')) for x in src[k]}


def greedy(xs, ys):
    """compare.py's rule: each source element takes its nearest unused element within 1 cm."""
    used, pairs = set(), {}
    for x in xs:
        best, bd = None, TOL
        for y in ys:
            if y['id'] in used:
                continue
            d = math.dist(x['point'], y['point']) * FT
            if d <= bd:
                best, bd = y, d
        if best is not None:
            used.add(best['id'])
            pairs[x['id']] = best
    return pairs


def judge(run):
    path = os.path.join(OUT, 'e3-%s.json' % run)
    plc = os.path.join(EXP, 'placement_%s.json' % run)
    if not (os.path.exists(path) and os.path.exists(plc)):
        return None
    got = load(path)
    placement = load(plc)
    placed = {p['id']: p for p in placement['placed']}
    ext = {x['id']: dict(x, cls=c) for c, k in (('door', 'doors'), ('window', 'windows')) for x in got[k]}
    rows, dists = [], []
    for i, t in sorted(truth.items()):
        p = placed.get(i, {})
        e = ext.get(p.get('new_id'))
        if e is None:
            rows.append({'id': i, 'placed': False, 'why': p.get('why') or 'not found after extraction'})
            continue
        d = math.dist(t['point'], e['point']) * FT
        dists.append(d)
        rows.append({'id': i, 'placed': True, 'distance_m': round(d, 4), 'same_type': e['type'] == t['type'],
                     'same_class': e['cls'] == t['cls'], 'right_host': to_source.get(e['host']) == t['host'],
                     'host_as_asked': e['host'] == p.get('host_rebuilt')})
    ok = [r for r in rows if r['placed']]
    pairs = greedy(list(truth.values()), list(ext.values()))
    n = lambda f: sum(1 for r in ok if f(r))
    return {
        'source_openings': len(truth), 'placed_through_mcp': placement['log']['placed_ok'],
        'found_after_extraction': len(ok), 'mcp_calls': placement['log']['calls'],
        'mcp_seconds': placement['log']['seconds'],
        'walls_after': len(got['walls']), 'floors_after': len(got['floors']),
        'same_position_1cm': len(pairs),
        'same_position_and_type_1cm': sum(1 for i, y in pairs.items() if y['type'] == truth[i]['type']),
        'same_class': n(lambda r: r['same_class']), 'same_type': n(lambda r: r['same_type']),
        'right_host': n(lambda r: r['right_host']), 'host_as_asked': n(lambda r: r['host_as_asked']),
        'within_10cm': n(lambda r: r['distance_m'] <= 0.10), 'within_50cm': n(lambda r: r['distance_m'] <= 0.50),
        'within_1m': n(lambda r: r['distance_m'] <= 1.0),
        'distance_m_median': round(sorted(dists)[len(dists) // 2], 3) if dists else None,
        'failed': [r for r in rows if not r['placed']][:20],
    }, rows


runs, detail = {}, {}
for run in ('truth', 'transformer'):
    res = judge(run)
    if res:
        runs[run], detail[run] = res
control = load(OUT, 'summary.json')
ctrl = {'doors_same_position_and_type': control['rows']['doors']['same_position_and_type'],
        'windows_same_position_and_type': control['rows']['windows']['same_position_and_type'],
        'hosts_kept': control['relations']['doors']['kept_matching_host'] +
        control['relations']['windows']['kept_matching_host']}
status = 'done' if len(runs) == 2 else 'partial' if runs else 'failed'
summary = {
    'id': 'e3-mcp-place', 'date': datetime.date.today().isoformat(), 'status': status,
    'question': 'Can the doors and windows be placed in Revit through an MCP server, and how close do E2\'s '
                'predictions land, at 1 cm as the round trip?',
    'input': 'pipeline/out/rebuilt.rvt (doors and windows removed) + '
             'pipeline/out/experiments/e2-mask-openings/predictions.json',
    'counts': {'runs': sorted(runs),
               'server': 'revit_batch_mcp.py: own minimal MCP server (stdio, 4 tools); commit applied by one click on '
                         'the E3 Place pyRevit button in the open, licensed Revit 2027',
               'revit_messages': {run: load(EXP, 'placement_%s.json' % run)['log'].get('commit', {})
                                  .get('revit_messages') for run in runs},
               **{run: {k: v for k, v in r.items() if k in ('source_openings', 'placed_through_mcp',
                                                             'found_after_extraction', 'mcp_calls', 'mcp_seconds',
                                                             'walls_after', 'floors_after')}
                  for run, r in runs.items()}},
    'metrics': {**{run: {k: v for k, v in r.items() if k not in ('failed',) and k not in (
        'source_openings', 'placed_through_mcp', 'found_after_extraction', 'mcp_calls', 'mcp_seconds', 'walls_after',
        'floors_after')} for run, r in runs.items()},
                'control_rebuild_py': ctrl},
    'notes': [
        'One model only (Autodesk sample): a smoke test of the assembly step through MCP.',
        '"truth" places the source model\'s own doors and windows through MCP: it tests the route, not a prediction. '
        '"transformer" places E2\'s predictions (type, host, place on the wall); their level is given.',
        'The MCP client sends one place_family_instance call per element (107), then commit and extract. Commit writes '
        'the queue to a job file and waits; one click on the E3 Place pyRevit button in the open Revit applies it: '
        'opens out/rebuilt.rvt in the background, deletes its doors and windows, places the queue on the host wall '
        'given by id, saves as out/e3/e3-<run>.rvt, closes, and runs extract.py. A person triggers each commit; the '
        'placements themselves come only from the MCP calls.',
        'First attempt, failed: the open-source Demolinator/revit-mcp-server over pyRevit Routes. On Revit 2027 with '
        'pyRevit 6.5.5 its extension startup never ran (no route registered) and Revit closed twice on a Routes '
        'worker-thread error. Its place_family also hosts on the nearest wall in 3D and cannot take a host id.',
        'Second attempt, failed: this server (revit_batch_mcp.py) in its pyrevit-run mode, starting a batch Revit; '
        'Revit stopped at start with "The License Manager is not functioning" (education licence), so the commit '
        'moved to the button in a Revit opened by hand.',
        'revit_messages are what Revit reported during the run (deleting and placing), counted as reported; their '
        'cause per element is not checked.',
        'Hand and facing flips are not predicted: the transformer run leaves the family default.',
        'Control: rebuild.py, with no AI, from pipeline/out/summary.json.',
    ],
}
if not runs:
    summary['notes'].append('No run found: Revit placement or extraction did not happen.')
for run, r in runs.items():
    if r['failed']:
        why = Counter(f.get('why') for f in r['failed'])
        summary['notes'].append('%s: %d of %d not in the saved model: %s.' % (
            run, r['source_openings'] - r['found_after_extraction'], r['source_openings'],
            ', '.join('%d %s' % (n, w) for w, n in why.most_common())))
if 'transformer' in runs:
    summary['notes'].append('Validity, transformer: Revit accepted %d of %d predicted placements and rolled the rest '
                            'back; during the run it reported overlapping inserts, inserts in conflict with joined '
                            'walls and instances not cutting anything (revit_messages), not checked per element. Type '
                            'and host counts are over the %d found after saving.' % (
                                runs['transformer']['placed_through_mcp'], runs['transformer']['source_openings'],
                                runs['transformer']['found_after_extraction']))
os.makedirs(EXP, exist_ok=True)
json.dump(summary, open(os.path.join(EXP, 'summary.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
json.dump(detail, open(os.path.join(EXP, 'per_element.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(json.dumps(summary, indent=1, ensure_ascii=False))
