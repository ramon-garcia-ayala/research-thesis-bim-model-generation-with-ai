# E3 · Place doors and windows in Revit through an MCP server, as an MCP client.
# Python 3 with the MCP SDK (e.g. the venv of C:\Users\gramo\tools\revit-mcp-server):
#   <python> pipeline/experiments/e3_place_via_mcp.py truth|transformer
# Revit must be closed: the server starts its own Revit session through pyrevit run.
#
# The server is revit_batch_mcp.py (own, minimal). The open-source Demolinator/revit-mcp-server was tried first and
# failed on Revit 2027 + pyRevit 6.5.5: its extension's startup never ran, and Routes closed Revit twice.
# One run: start_session on out/rebuilt.rvt, one place_family_instance call per door or window (host wall by id),
# commit (Revit deletes the model's openings, places the queued ones, saves as out/e3/e3-<run>.rvt), extract.
# "truth" places the source model's openings, so it tests the MCP route itself; "transformer" places E2's predictions.
# rebuild.py stays the control with no AI.
import asyncio, datetime, json, math, os, sys, time

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'out'))
EXP = os.path.join(OUT, 'experiments', 'e3-mcp-place')
FT = 0.3048
RUNS = ('truth', 'transformer')

load = lambda n: json.load(open(os.path.join(OUT, n), encoding='utf-8'))


def wall_gap(x, y):
    p, q = x['curve']['p'], y['curve']['p']
    if len(p) != len(q):
        return 1e9
    d = lambda u, v: math.dist(u, v) * FT
    direct = max(d(u, v) for u, v in zip(p, q))
    return min(direct, max(d(u, v) for u, v in zip(p, list(reversed(q)))))


def wall_map(a, b, tol=0.01):
    """Source wall id -> rebuilt wall id, nearest within 1 cm (as compare.py)."""
    out, used = {}, set()
    for x in a['walls']:
        best, bd = None, tol
        for y in b['walls']:
            if y['id'] in used:
                continue
            g = wall_gap(x, y)
            if g <= bd:
                best, bd = y['id'], g
        if best is not None:
            used.add(best)
            out[x['id']] = best
    return out


def jobs(run):
    src = load('source.json')
    wmap = wall_map(src, load('rebuilt.json'))
    elev = {l['name']: l['elevation'] for l in src['levels']}
    items = {x['id']: dict(x, cls=c) for c, k in (('door', 'doors'), ('window', 'windows')) for x in src[k]}
    out = []
    if run == 'truth':
        for i, x in sorted(items.items()):
            out.append({'id': i, 'cls': x['cls'], 'type': x['type'], 'host_source': x['host'], 'level': x['level'],
                        'point_ft': x['point'], 'sill_ft': x['sill'], 'hand': x['hand_flipped'],
                        'facing': x['facing_flipped']})
    else:
        preds = json.load(open(os.path.join(OUT, 'experiments', 'e2-mask-openings', 'predictions.json'),
                               encoding='utf-8'))
        for r in preds['rows']:
            if r['model'] != run:
                continue
            p, x = r['pred'], items[r['id']]
            sill = p['sill'] / FT
            out.append({'id': r['id'], 'cls': p['cls'], 'type': p['type'].split(' | ', 1), 'host_source': p['host'],
                        'level': x['level'], 'point_ft': [p['pt'][0] / FT, p['pt'][1] / FT, elev[x['level']] + sill],
                        'sill_ft': sill, 'hand': None, 'facing': None})
    for j in out:
        j['host_rebuilt'] = wmap.get(j['host_source'])
    return out


def text(result):
    return '\n'.join(getattr(c, 'text', '') for c in result.content)


async def main(run):
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    todo = jobs(run)
    params = StdioServerParameters(command=sys.executable, args=[os.path.join(HERE, 'revit_batch_mcp.py')])
    log = {'run': run, 'date': datetime.date.today().isoformat(), 'calls': 0,
           'server': 'revit_batch_mcp.py (own MCP server, stdio, not Routes); commit applied in the open Revit by '
                     'the E3 Place pyRevit button'}
    t0 = time.time()
    target = os.path.join(OUT, 'e3', 'e3-%s.rvt' % run)
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            log['server_tools'] = [t.name for t in (await s.list_tools()).tools]

            async def call(name, args):
                log['calls'] += 1
                return json.loads(text(await s.call_tool(name, args)))

            sid = (await call('start_session', {'base_model': os.path.join(OUT, 'rebuilt.rvt')}))['session_id']
            skipped = []
            for j in todo:
                if j['host_rebuilt'] is None:
                    skipped.append(j['id'])
                    continue
                x, y, z = j['point_ft']
                await call('place_family_instance', {
                    'session_id': sid, 'family': j['type'][0], 'type_name': j['type'][1],
                    'host_wall_id': j['host_rebuilt'], 'level': j['level'], 'x': x, 'y': y, 'z': z,
                    'sill': j['sill_ft'], 'hand_flipped': j['hand'], 'facing_flipped': j['facing'],
                    'tag': str(j['id'])})
            print('queued %d; commit waits for a click on "E3 Place" in Revit...' % (len(todo) - len(skipped)),
                  flush=True)
            rep = await call('commit', {'session_id': sid, 'out_model': target})
            log['commit'] = {k: rep.get(k) for k in ('mode', 'returncode', 'seconds', 'deleted_openings', 'job_items',
                                                      'saved_as', 'error', 'revit_messages', 'button')}
            print('commit:', json.dumps(log['commit'])[:600], flush=True)
            if rep.get('saved_as'):
                log['extract'] = await call('extract', {'model': target})
                print('extract:', json.dumps(log['extract']), flush=True)
    by_tag = {p.get('tag'): p for p in rep.get('placed', [])}
    placed = []
    for j in todo:
        p = by_tag.get(str(j['id']), {'ok': False, 'why': 'host wall not in the rebuilt model'
                                      if j['id'] in skipped else 'not reported by Revit'})
        placed.append(dict(j, **{k: v for k, v in p.items() if k != 'tag'}))
    log['seconds'] = round(time.time() - t0, 1)
    log['placed_ok'] = sum(1 for p in placed if p.get('ok'))
    log['placed_failed'] = [{'id': p['id'], 'why': p.get('why')} for p in placed if not p.get('ok')]
    log['host_as_asked'] = sum(1 for p in placed if p.get('ok') and p.get('host') == p['host_rebuilt'])
    os.makedirs(EXP, exist_ok=True)
    json.dump({'log': log, 'placed': placed}, open(os.path.join(EXP, 'placement_%s.json' % run), 'w',
                                                   encoding='utf-8'), indent=1, ensure_ascii=False)
    print(json.dumps({k: v for k, v in log.items() if k not in ('placed_failed',)}, indent=1,
                     ensure_ascii=False)[:1500])


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in RUNS:
        raise SystemExit('usage: e3_place_via_mcp.py truth|transformer')
    asyncio.run(main(sys.argv[1]))
