# -*- coding: utf-8 -*-
# First test of the pipeline. Runs inside Revit through `pyrevit run` (IronPython 2.7).
# Builds a new project from out/source.json. The source model is opened ONLY as a library of types and families:
# every placement, level and relation comes from the JSON.
import json, os, traceback
from collections import Counter
import clr
clr.AddReference('System')
from System.Collections.Generic import List
from Autodesk.Revit.DB import (Arc, BuiltInParameter as BIP, CopyPasteOptions, Curve, CurveLoop, DuplicateTypeAction,
                               ElementId, ElementTransformUtils, FailureProcessingResult, FailureSeverity,
                               FamilySymbol, FilteredElementCollector as FEC, Floor, FloorType, IDuplicateTypeNamesHandler,
                               IFailuresPreprocessor, Level, Line, SaveAsOptions, Transaction, Transform, UnitSystem, UV, Wall,
                               WallType, XYZ)
from Autodesk.Revit.DB.Structure import StructuralType

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'out')
BATCH = 100
log_path = os.path.join(OUT, 'rebuild.log')
report = {'created': Counter(), 'failed': [], 'revit_messages': Counter(), 'type_copy_failures': [], 'transactions': {}}


def log(msg):
    with open(log_path, 'a') as f:
        f.write(str(msg) + '\n')


class Swallow(IFailuresPreprocessor):
    def PreprocessFailures(self, fa):
        resolved = False
        for m in fa.GetFailureMessages():
            sev = m.GetSeverity()
            report['revit_messages'][str(sev) + ': ' + m.GetDescriptionText()] += 1
            if sev == FailureSeverity.Warning:
                fa.DeleteWarning(m)
            elif m.HasResolutions():
                fa.ResolveFailure(m)
                resolved = True
        # ProceedWithCommit with nothing resolved silently rolls the transaction back.
        return FailureProcessingResult.ProceedWithCommit if resolved else FailureProcessingResult.Continue


class KeepDestination(IDuplicateTypeNamesHandler):
    def OnDuplicateTypeNamesFound(self, args):
        return DuplicateTypeAction.UseDestinationTypes


class Tx(object):
    def __init__(self, doc, name):
        self.t = Transaction(doc, name)

    def __enter__(self):
        self.t.Start()
        o = self.t.GetFailureHandlingOptions()
        o.SetFailuresPreprocessor(Swallow())
        o.SetClearAfterRollback(True)
        self.t.SetFailureHandlingOptions(o)
        return self.t

    def __exit__(self, kind, value, tb):
        if kind is None:
            status = str(self.t.Commit())
            report['transactions'][status] = report['transactions'].get(status, 0) + 1
        else:
            self.t.RollBack()
        return False


def xyz(p):
    return XYZ(p[0], p[1], p[2])


def to_curve(c):
    if c['t'] == 'line':
        return Line.CreateBound(xyz(c['p'][0]), xyz(c['p'][1]))
    if c['t'] == 'arc':
        return Arc.Create(xyz(c['p'][0]), xyz(c['p'][1]), xyz(c['p'][2]))
    return None


def fail(cat, item, why):
    report['failed'].append({'category': cat, 'id': item.get('id'), 'type': item.get('type'), 'why': str(why)[:200]})


def chunks(seq):
    for i in range(0, len(seq), BATCH):
        yield seq[i:i + BATCH]


def key_of(t):
    p = t.get_Parameter(BIP.ALL_MODEL_TYPE_NAME) or t.get_Parameter(BIP.SYMBOL_NAME_PARAM)
    return (t.FamilyName, p.AsString() if p else None)


def type_index(doc):
    idx = {}
    for cls in (WallType, FloorType, FamilySymbol):
        for t in FEC(doc).OfClass(cls):
            idx[key_of(t)] = t
    return idx


def copy_types(src, doc, data):
    wanted = set()
    for k in ('walls', 'floors', 'doors', 'windows'):
        for it in data[k]:
            if it['type']:
                wanted.add(tuple(it['type']))
    source = type_index(src)
    opts = CopyPasteOptions()
    opts.SetDuplicateTypeNamesHandler(KeepDestination())
    for key in sorted(wanted, key=str):
        if key not in source:
            report['type_copy_failures'].append({'type': key, 'why': 'not found in source'})
            continue
        try:
            with Tx(doc, 'copy type'):
                ElementTransformUtils.CopyElements(src, List[ElementId]([source[key].Id]), doc, Transform.Identity, opts)
        except Exception as e:
            report['type_copy_failures'].append({'type': key, 'why': str(e)[:200]})
    return type_index(doc)


def build_levels(doc, data):
    old = list(FEC(doc).OfClass(Level))
    levels = {}
    with Tx(doc, 'levels'):
        for i, l in enumerate(old):
            l.Name = '__old_%d' % i
        # A new project's default levels may not be deletable, so they are reused for the first levels in the JSON.
        spare = list(old)
        for l in data['levels']:
            n = spare.pop(0) if spare else Level.Create(doc, l['elevation'])
            n.Elevation = l['elevation']
            n.Name = l['name']
            levels[l['name']] = n
            report['created']['levels'] += 1
    for l in spare:
        try:
            with Tx(doc, 'remove default level'):
                doc.Delete(l.Id)
        except Exception as e:
            report['failed'].append({'category': 'levels', 'id': None, 'type': None, 'why': 'default level kept: %s' % e})
    return levels


def set_phase(doc, el, phase, phases):
    if not phase:
        return
    for key, bip in (('created', BIP.PHASE_CREATED), ('demolished', BIP.PHASE_DEMOLISHED)):
        n = phase.get(key)
        p = el.get_Parameter(bip)
        if n in phases and p is not None and not p.IsReadOnly:
            p.Set(phases[n].Id)


def build_walls(doc, data, types, levels, phases):
    made = {}
    for batch in chunks(data['walls']):
        with Tx(doc, 'walls'):
            for w in batch:
                try:
                    t = types.get(tuple(w['type']))
                    c = to_curve(w['curve'])
                    lvl = levels.get(w['base_level'])
                    if t is None or c is None or lvl is None:
                        fail('walls', w, 'missing ' + ('type' if t is None else 'curve' if c is None else 'level'))
                        continue
                    n = Wall.Create(doc, c, t.Id, lvl.Id, float(w['height'] or 10.0), float(w['base_offset'] or 0.0),
                                    bool(w['flipped']), bool(w['structural']))
                    if w['location_line'] is not None:
                        n.get_Parameter(BIP.WALL_KEY_REF_PARAM).Set(int(w['location_line']))
                        n.Location.Curve = c
                    top = levels.get(w['top_level'])
                    if top is not None:
                        n.get_Parameter(BIP.WALL_HEIGHT_TYPE).Set(top.Id)
                        if w['top_offset'] is not None:
                            n.get_Parameter(BIP.WALL_TOP_OFFSET).Set(float(w['top_offset']))
                    set_phase(doc, n, w['phase'], phases)
                    made[w['id']] = n
                    report['created']['walls'] += 1
                except Exception as e:
                    fail('walls', w, e)
    return made


def build_floors(doc, data, types, levels, phases):
    for batch in chunks(data['floors']):
        with Tx(doc, 'floors'):
            for f in batch:
                try:
                    t = types.get(tuple(f['type'])) if f['type'] else None
                    lvl = levels.get(f['level'])
                    if t is None or lvl is None or not f['loops']:
                        fail('floors', f, 'missing type, level or outline')
                        continue
                    loops = List[CurveLoop]()
                    for loop in f['loops']:
                        cl = CurveLoop()
                        for c in loop:
                            if c['t'] == 'other':
                                pts = c['p']
                                for a, b in zip(pts, pts[1:]):
                                    cl.Append(Line.CreateBound(xyz(a), xyz(b)))
                            else:
                                cl.Append(to_curve(c))
                        loops.Add(cl)
                    n = Floor.Create(doc, loops, t.Id, lvl.Id)
                    if f['offset'] is not None:
                        n.get_Parameter(BIP.FLOOR_HEIGHTABOVELEVEL_PARAM).Set(float(f['offset']))
                    set_phase(doc, n, f['phase'], phases)
                    report['created']['floors'] += 1
                except Exception as e:
                    fail('floors', f, e)


def build_openings(doc, data, key, types, levels, walls, phases):
    for batch in chunks(data[key]):
        made = []
        with Tx(doc, key):
            for it in batch:
                try:
                    t = types.get(tuple(it['type'])) if it['type'] else None
                    host = walls.get(it['host'])
                    lvl = levels.get(it['level'])
                    if t is None or host is None or lvl is None:
                        why = 'missing type' if t is None else 'host not rebuilt: %s' % it['host_category'] if host is None else 'missing level'
                        fail(key, it, why)
                        continue
                    if not t.IsActive:
                        t.Activate()
                        doc.Regenerate()
                    n = doc.Create.NewFamilyInstance(xyz(it['point']), t, host, lvl, StructuralType.NonStructural)
                    set_phase(doc, n, it['phase'], phases)
                    made.append((n, it))
                    report['created'][key] += 1
                except Exception as e:
                    fail(key, it, e)
            doc.Regenerate()
            for n, it in made:
                try:
                    if it['sill'] is not None:
                        p = n.get_Parameter(BIP.INSTANCE_SILL_HEIGHT_PARAM)
                        if p is not None and not p.IsReadOnly:
                            p.Set(float(it['sill']))
                    if n.CanFlipFacing and n.FacingFlipped != it['facing_flipped']:
                        n.flipFacing()
                    if n.CanFlipHand and n.HandFlipped != it['hand_flipped']:
                        n.flipHand()
                except Exception as e:
                    fail(key, it, 'adjust: %s' % e)


def build_rooms(doc, data, levels):
    for batch in chunks(data['rooms']):
        with Tx(doc, 'rooms'):
            for rm in batch:
                try:
                    lvl = levels.get(rm['level'])
                    if lvl is None:
                        fail('rooms', rm, 'missing level')
                        continue
                    n = doc.Create.NewRoom(lvl, UV(rm['point'][0], rm['point'][1]))
                    if rm['number']:
                        n.get_Parameter(BIP.ROOM_NUMBER).Set(rm['number'])
                    if rm['name']:
                        n.get_Parameter(BIP.ROOM_NAME).Set(rm['name'])
                    report['created']['rooms'] += 1
                except Exception as e:
                    fail('rooms', rm, e)


try:
    app = getattr(__revit__, 'Application', __revit__)
    with open(os.path.join(OUT, 'source.json')) as f:
        data = json.load(f)
    # JSON gives unicode strings; Revit accepts them, and type keys are compared as tuples of text.
    log('opening type library')
    src = app.OpenDocumentFile(__models__[0])
    doc = app.NewProjectDocument(UnitSystem.Imperial)
    phases = {p.Name: p for p in doc.Phases}
    report['target_phases'] = list(phases.keys())
    types = copy_types(src, doc, data)
    log('types ready: %d' % len(types))
    levels = build_levels(doc, data)
    log('levels ok')
    walls = build_walls(doc, data, types, levels, phases)
    log('walls %d' % len(walls))
    build_floors(doc, data, types, levels, phases)
    build_openings(doc, data, 'doors', types, levels, walls, phases)
    build_openings(doc, data, 'windows', types, levels, walls, phases)
    build_rooms(doc, data, levels)
    log('all built')
    o = SaveAsOptions()
    o.OverwriteExistingFile = True
    doc.SaveAs(os.path.join(OUT, 'rebuilt.rvt'), o)
    doc.Close(False)
    src.Close(False)
    log('done')
except Exception:
    log(traceback.format_exc())
finally:
    report['created'] = dict(report['created'])
    report['revit_messages'] = dict(report['revit_messages'])
    with open(os.path.join(OUT, 'rebuild_report.json'), 'w') as f:
        json.dump(report, f, indent=1)
