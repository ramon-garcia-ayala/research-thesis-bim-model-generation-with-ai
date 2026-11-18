# -*- coding: utf-8 -*-
# E3 · Applies the job that revit_batch_mcp.py (MCP server) queued in pipeline/out/e3/job.json, in this licensed Revit
# session: runs pipeline/experiments/e3_revit_place.py (opens the base model in the background, deletes its doors and
# windows, places the queue, saves as out_path, closes), then pipeline/extract.py on the saved model. Writes
# pipeline/out/e3/done.json, which the MCP server waits for. The base model must not be open in the UI.
import json, os, time, traceback

PIPE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
E3 = os.path.join(PIPE, 'out', 'e3')
done = {'started': time.strftime('%H:%M:%S')}


def run(path, model):
    g = {'__name__': '__main__', '__file__': path, '__revit__': __revit__, '__models__': [model]}
    exec(compile(open(path).read(), path, 'exec'), g)


try:
    job = json.load(open(os.path.join(E3, 'job.json')))
    done['job_id'] = job.get('job_id')
    done['out_path'] = job.get('out_path')
    t0 = time.time()
    run(os.path.join(PIPE, 'experiments', 'e3_revit_place.py'), job['base_model'])
    done['place_seconds'] = round(time.time() - t0, 1)
    rep = json.load(open(os.path.join(E3, 'report.json')))
    if rep.get('saved_as'):
        t1 = time.time()
        run(os.path.join(PIPE, 'extract.py'), rep['saved_as'])
        done['extract_seconds'] = round(time.time() - t1, 1)
        name = os.path.splitext(os.path.basename(rep['saved_as']))[0]
        done['extract_json'] = os.path.join(PIPE, 'out', name + '.json')
        done['extract_ok'] = os.path.exists(done['extract_json'])
except Exception:
    done['error'] = traceback.format_exc()
done['finished'] = time.strftime('%H:%M:%S')
with open(os.path.join(E3, 'done.json'), 'w') as f:
    json.dump(done, f, indent=1)
print(json.dumps(done, indent=1))
