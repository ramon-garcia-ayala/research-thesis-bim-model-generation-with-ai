# E3 · Place doors and windows through an MCP server for Revit (Demolinator/revit-mcp-server, over pyRevit Routes).
# Python 3, run with the server's own environment (it has the MCP SDK):
#   <server>/.venv/Scripts/python.exe pipeline/experiments/e3_place_via_mcp.py truth|transformer
# Revit must be open on pipeline/out/rebuilt.rvt (or on a model saved by a previous run of this script), with the
# extension loaded and the Routes server on.
#
# One run: delete every door and window of the active model (delete_elements), place the 107 of the run one call at a
# time (execute_revit_code, with the host wall chosen by id: the server's place_family picks the nearest wall in 3D and
# cannot be told the host), save as out/e3/e3-<run>.rvt (save_document). "truth" places the source model's openings,
# so it tests the MCP route itself; "transformer" places E2's predictions. rebuild.py stays the control with no AI.
import asyncio, datetime, json, math, os, sys, time

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'out'))
EXP = os.path.join(OUT, 'experiments', 'e3-mcp-place')
SERVER = os.environ.get('REVIT_MCP_SERVER', r'C:\Users\gramo\tools\revit-mcp-server')
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


PLACE = r'''
import json
J = json.loads(%s)
BIP = DB.BuiltInParameter
def key_of(t):
    p = t.get_Parameter(BIP.ALL_MODEL_TYPE_NAME) or t.get_Parameter(BIP.SYMBOL_NAME_PARAM)
    return [t.FamilyName, p.AsString() if p else None]
sym = None
for t in DB.FilteredElementCollector(doc).OfClass(DB.FamilySymbol):
    if key_of(t) == J['type']:
        sym = t
        break
host = doc.GetElement(DB.ElementId(System.Int64(J['host'])))
lvl = None
for l in DB.FilteredElementCollector(doc).OfClass(DB.Level):
    if l.Name == J['level']:
        lvl = l
res = {'ok': False}
if sym is None or host is None or lvl is None:
    res['why'] = 'missing type' if sym is None else 'missing host' if host is None else 'missing level'
else:
    if not sym.IsActive:
        sym.Activate()
        doc.Regenerate()
    p = J['point']
    n = doc.Create.NewFamilyInstance(DB.XYZ(p[0], p[1], p[2]), sym, host, lvl, DB.Structure.StructuralType.NonStructural)
    doc.Regenerate()
    s = n.get_Parameter(BIP.INSTANCE_SILL_HEIGHT_PARAM)
    if J['sill'] is not None and s is not None and not s.IsReadOnly:
        s.Set(float(J['sill']))
    if J['facing'] is not None and n.CanFlipFacing and n.FacingFlipped != J['facing']:
        n.flipFacing()
    if J['hand'] is not None and n.CanFlipHand and n.HandFlipped != J['hand']:
        n.flipHand()
    res = {'ok': True, 'new_id': int(str(n.Id.Value)), 'host': int(str(n.Host.Id.Value)) if n.Host else None}
print(json.dumps(res))
'''

STATE = r'''
import json
c = lambda b: DB.FilteredElementCollector(doc).OfCategory(b).WhereElementIsNotElementType().ToElementIds()
ids = [int(str(i.Value)) for i in list(c(DB.BuiltInCategory.OST_Doors)) + list(c(DB.BuiltInCategory.OST_Windows))]
print(json.dumps({'title': doc.Title, 'path': doc.PathName, 'walls': c(DB.BuiltInCategory.OST_Walls).Count,
                  'openings': ids}))
'''


def text(result):
    return '\n'.join(getattr(c, 'text', '') for c in result.content)


def output(result):
    """execute_revit_code returns the server's JSON; the printed line sits in its 'output' field."""
    raw = text(result)
    try:
        body = json.loads(raw)
        raw = body.get('output', raw) if isinstance(body, dict) else raw
    except ValueError:
        pass
    lines = [l for l in str(raw).splitlines() if l.strip().startswith('{')]
    return json.loads(lines[-1]) if lines else {'ok': False, 'why': 'no output: ' + str(raw)[:300]}


async def main(run):
    todo = jobs(run)
    params = StdioServerParameters(command=os.path.join(SERVER, '.venv', 'Scripts', 'python.exe'),
                                   args=[os.path.join(SERVER, 'main.py')], cwd=SERVER)
    log, t0 = {'run': run, 'date': datetime.date.today().isoformat(), 'server': SERVER, 'calls': 0}, time.time()
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = [t.name for t in (await s.list_tools()).tools]
            log['server_tools'] = len(tools)
            call = lambda name, args: (log.__setitem__('calls', log['calls'] + 1), s.call_tool(name, args))[1]
            # No get_revit_status: upstream its route reads revit.doc on the server thread, which crashed Revit 2027
            # (2026-11-17); every call here goes through routes that run on the Revit API thread.
            before = output(await call('execute_revit_code', {'code': STATE, 'description': 'E3 state'}))
            log['before'] = {k: (len(v) if k == 'openings' else v) for k, v in before.items()}
            if 'openings' not in before:
                raise SystemExit('Revit did not answer: %s' % before)
            if before['openings']:
                log['delete'] = text(await call('delete_elements', {'element_ids': before['openings']}))[:300]
            mid = output(await call('execute_revit_code', {'code': STATE, 'description': 'E3 state'}))
            log['after_delete_openings'] = len(mid['openings'])
            placed = []
            for j in todo:
                if j['host_rebuilt'] is None:
                    placed.append(dict(j, ok=False, why='host wall not in the rebuilt model'))
                    continue
                payload = {'type': j['type'], 'host': j['host_rebuilt'], 'level': j['level'], 'point': j['point_ft'],
                           'sill': j['sill_ft'], 'hand': j['hand'], 'facing': j['facing']}
                code = PLACE % json.dumps(json.dumps(payload))
                res = output(await call('execute_revit_code', {'code': code, 'description': 'E3 place %d' % j['id']}))
                placed.append(dict(j, **res))
            os.makedirs(os.path.join(OUT, 'e3'), exist_ok=True)
            target = os.path.join(OUT, 'e3', 'e3-%s.rvt' % run)
            log['save'] = text(await call('save_document', {'file_path': target, 'overwrite': True}))[:300]
            log['saved_as'] = target
    log['seconds'] = round(time.time() - t0, 1)
    log['placed_ok'] = sum(1 for p in placed if p.get('ok'))
    log['placed_failed'] = [{'id': p['id'], 'why': p.get('why')} for p in placed if not p.get('ok')]
    log['host_as_asked'] = sum(1 for p in placed if p.get('ok') and p.get('host') == p['host_rebuilt'])
    os.makedirs(EXP, exist_ok=True)
    json.dump({'log': log, 'placed': placed}, open(os.path.join(EXP, 'placement_%s.json' % run), 'w',
                                                   encoding='utf-8'), indent=1, ensure_ascii=False)
    print(json.dumps(log, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in RUNS:
        raise SystemExit('usage: e3_place_via_mcp.py truth|transformer')
    asyncio.run(main(sys.argv[1]))
