# A minimal MCP server for Revit that does not use pyRevit Routes (Routes closed Revit 2027 twice on 2026-11-17).
# MCP clients queue placements one call at a time; commit applies them in a Revit session started by `pyrevit run`
# (the same route rebuild.py and extract.py use), and extract runs extract.py on the result. Lengths in Revit feet.
#
# Run (stdio):  <python with the mcp package> pipeline/experiments/revit_batch_mcp.py
# Claude Code:  claude mcp add revit-batch -- <python> <repo>/pipeline/experiments/revit_batch_mcp.py
import json, os, subprocess, sys, time, uuid

from mcp.server.fastmcp import FastMCP

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(PIPE, 'out')
E3 = os.path.join(OUT, 'e3')
PYREVIT = os.environ.get('PYREVIT', r'C:\Program Files\pyRevit-Master\bin\pyrevit.exe')
REVIT = os.environ.get('REVIT_YEAR', '2027')
MODE = os.environ.get('REVIT_MODE', 'button')  # button: a click in an open Revit applies commit; pyrevit-run: batch

mcp = FastMCP('revit-batch')
SESSIONS = {}


def _run(script, model):
    """Start Revit through pyrevit run on one model and wait for it to close."""
    t0 = time.time()
    p = subprocess.run([PYREVIT, 'run', script, model, '--revit=%s' % REVIT, '--purge'], capture_output=True,
                       text=True, timeout=1800)
    with open(os.path.join(E3, 'pyrevit_run.log'), 'a', encoding='utf-8') as f:
        f.write('%s %s %s rc=%s\n%s\n%s\n' % (time.strftime('%H:%M:%S'), script, model, p.returncode, p.stdout[-2000:],
                                             p.stderr[-2000:]))
    return p.returncode, round(time.time() - t0, 1)


@mcp.tool()
def start_session(base_model: str) -> str:
    """Start a placement session on a Revit model (.rvt path). Returns the session id."""
    if not os.path.exists(base_model):
        return json.dumps({'error': 'model not found: %s' % base_model})
    sid = uuid.uuid4().hex[:8]
    SESSIONS[sid] = {'base_model': os.path.abspath(base_model), 'items': []}
    return json.dumps({'session_id': sid, 'base_model': SESSIONS[sid]['base_model']})


@mcp.tool()
def place_family_instance(session_id: str, family: str, type_name: str, host_wall_id: int, level: str, x: float,
                          y: float, z: float, sill: float | None = None, hand_flipped: bool | None = None,
                          facing_flipped: bool | None = None, tag: str | None = None) -> str:
    """Queue one hosted family instance (door or window) on the wall with id host_wall_id, at x, y, z in Revit feet.
    Nothing reaches Revit until commit."""
    s = SESSIONS.get(session_id)
    if s is None:
        return json.dumps({'error': 'unknown session'})
    s['items'].append({'family': family, 'type_name': type_name, 'host_wall_id': int(host_wall_id), 'level': level,
                       'x': x, 'y': y, 'z': z, 'sill': sill, 'hand_flipped': hand_flipped,
                       'facing_flipped': facing_flipped, 'tag': tag})
    return json.dumps({'queued': len(s['items'])})


@mcp.tool()
def commit(session_id: str, out_model: str) -> str:
    """Open the session's model in Revit (pyrevit run), delete its doors and windows, place every queued instance,
    save as out_model and close. Returns what Revit reported for each placement."""
    s = SESSIONS.get(session_id)
    if s is None:
        return json.dumps({'error': 'unknown session'})
    os.makedirs(E3, exist_ok=True)
    report_path, done_path = os.path.join(E3, 'report.json'), os.path.join(E3, 'done.json')
    for p in (report_path, done_path):
        if os.path.exists(p):
            os.remove(p)
    with open(os.path.join(E3, 'job.json'), 'w', encoding='utf-8') as f:
        job_id = uuid.uuid4().hex[:8]
        json.dump({'job_id': job_id, 'base_model': s['base_model'], 'out_path': os.path.abspath(out_model),
                   'items': s['items']}, f)
    if MODE == 'button':
        # A person clicks "E3 Place" (pipeline/pyrevit/ThesisE3.extension) in an open, licensed Revit: it applies this
        # job, saves, and runs extract.py. pyrevit run could not start Revit here (license manager error, 2026-11-17).
        t0 = time.time()
        done = None
        while time.time() - t0 < 3600:
            if os.path.exists(done_path):
                time.sleep(1)
                d = json.load(open(done_path, encoding='utf-8'))
                if d.get('job_id') == job_id:  # ignore a click that ran an older job
                    done = d
                    break
            time.sleep(2)
        if done is None:
            return json.dumps({'error': 'nobody ran E3 Place in Revit within an hour'})
        rep = json.load(open(report_path, encoding='utf-8')) if os.path.exists(report_path) else {}
        rep.update({'mode': 'button', 'seconds': round(time.time() - t0, 1), 'button': done})
        return json.dumps(rep)
    rc, secs = _run(os.path.join(HERE, 'e3_revit_place.py'), s['base_model'])
    if not os.path.exists(report_path):
        return json.dumps({'error': 'Revit wrote no report', 'returncode': rc, 'seconds': secs})
    rep = json.load(open(report_path, encoding='utf-8'))
    rep.update({'returncode': rc, 'seconds': secs})
    return json.dumps(rep)


@mcp.tool()
def extract(model: str) -> str:
    """Run the pipeline's extract.py on a Revit model; returns the JSON path and element counts."""
    name = os.path.splitext(os.path.basename(model))[0]
    target = os.path.join(OUT, name + '.json')
    if MODE == 'button':  # the E3 Place button already ran extract.py after saving
        if not os.path.exists(target):
            return json.dumps({'error': 'extract.py output not found: %s' % target})
        data = json.load(open(target, encoding='utf-8'))
        return json.dumps({'json': target, 'mode': 'button',
                           'counts': {k: len(data[k]) for k in ('walls', 'floors', 'doors', 'windows', 'rooms')}})
    if os.path.exists(target):
        os.remove(target)
    rc, secs = _run(os.path.join(PIPE, 'extract.py'), os.path.abspath(model))
    if not os.path.exists(target):
        return json.dumps({'error': 'extract.py wrote nothing', 'returncode': rc, 'seconds': secs})
    data = json.load(open(target, encoding='utf-8'))
    return json.dumps({'json': target, 'seconds': secs,
                       'counts': {k: len(data[k]) for k in ('walls', 'floors', 'doors', 'windows', 'rooms')}})


if __name__ == '__main__':
    mcp.run()
