# -*- coding: utf-8 -*-
# First test of the pipeline. Runs inside Revit through `pyrevit run` (IronPython 2.7).
# Writes levels, walls, floors, doors, windows and rooms of a model to JSON. Lengths stay in Revit's internal feet.
import json, os, traceback
from collections import Counter
from Autodesk.Revit.DB import (BuiltInCategory as BIC, BuiltInParameter as BIP, CategoryType, ElementId, FamilyInstance,
                               FilteredElementCollector as FEC, Floor, Level, LocationCurve, LocationPoint, Wall, Line, Arc)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
model = __models__[0]
name = os.path.splitext(os.path.basename(model))[0]
log_path = os.path.join(OUT, name + '.extract.log')


def log(msg):
    with open(log_path, 'a') as f:
        f.write(str(msg) + '\n')


def eid(i):
    # Revit 2024+ exposes ElementId.Value as Int64, which IronPython's json cannot write.
    return int(str(i.Value)) if hasattr(i, 'Value') else i.IntegerValue


def r(v):
    return round(float(v), 6)


def pt(p):
    return [r(p.X), r(p.Y), r(p.Z)]


def curve(c):
    if isinstance(c, Line):
        return {'t': 'line', 'p': [pt(c.GetEndPoint(0)), pt(c.GetEndPoint(1))]}
    if isinstance(c, Arc) and c.IsBound:
        return {'t': 'arc', 'p': [pt(c.GetEndPoint(0)), pt(c.GetEndPoint(1)), pt(c.Evaluate(0.5, True))]}
    return {'t': 'other', 'kind': c.GetType().Name, 'p': [pt(p) for p in c.Tessellate()]}


def par(el, bip):
    p = el.get_Parameter(bip)
    if p is None or not p.HasValue:
        return None
    st = str(p.StorageType)
    if st == 'Double':
        return r(p.AsDouble())
    if st == 'Integer':
        return p.AsInteger()
    if st == 'String':
        return p.AsString()
    return p.AsElementId()


def named(doc, i):
    if i is None or i == ElementId.InvalidElementId:
        return None
    e = doc.GetElement(i)
    return e.Name if e is not None else None


def type_key(doc, el):
    t = doc.GetElement(el.GetTypeId())
    if t is None:
        return None
    n = par(t, BIP.ALL_MODEL_TYPE_NAME) or par(t, BIP.SYMBOL_NAME_PARAM)
    return [t.FamilyName, n]


def phases(doc, el):
    return {'created': named(doc, par(el, BIP.PHASE_CREATED)), 'demolished': named(doc, par(el, BIP.PHASE_DEMOLISHED))}


def extract(doc):
    out = {'units': 'feet', 'file': os.path.basename(model), 'phases': [p.Name for p in doc.Phases],
           'warnings': doc.GetWarnings().Count, 'skipped': Counter(), 'levels': [], 'walls': [], 'floors': [],
           'doors': [], 'windows': [], 'rooms': []}
    for l in FEC(doc).OfClass(Level):
        out['levels'].append({'id': eid(l.Id), 'name': l.Name, 'elevation': r(l.Elevation)})

    for w in FEC(doc).OfClass(Wall):
        if not isinstance(w.Location, LocationCurve):
            out['skipped']['wall without curve'] += 1
            continue
        if w.IsStackedWallMember:
            out['skipped']['stacked wall member'] += 1
            continue
        d = {'id': eid(w.Id), 'type': type_key(doc, w), 'curve': curve(w.Location.Curve),
             'base_level': named(doc, par(w, BIP.WALL_BASE_CONSTRAINT)), 'base_offset': par(w, BIP.WALL_BASE_OFFSET),
             'top_level': named(doc, par(w, BIP.WALL_HEIGHT_TYPE)), 'top_offset': par(w, BIP.WALL_TOP_OFFSET),
             'height': par(w, BIP.WALL_USER_HEIGHT_PARAM), 'location_line': par(w, BIP.WALL_KEY_REF_PARAM),
             'flipped': w.Flipped, 'structural': par(w, BIP.WALL_STRUCTURAL_SIGNIFICANT),
             'curtain': w.CurtainGrid is not None, 'edited_profile': w.SketchId != ElementId.InvalidElementId,
             'length': par(w, BIP.CURVE_ELEM_LENGTH), 'area': par(w, BIP.HOST_AREA_COMPUTED), 'phase': phases(doc, w)}
        out['walls'].append(d)

    for f in FEC(doc).OfClass(Floor):
        d = {'id': eid(f.Id), 'type': type_key(doc, f), 'level': named(doc, f.LevelId),
             'offset': par(f, BIP.FLOOR_HEIGHTABOVELEVEL_PARAM), 'structural': par(f, BIP.FLOOR_PARAM_IS_STRUCTURAL),
             'area': par(f, BIP.HOST_AREA_COMPUTED), 'phase': phases(doc, f), 'loops': []}
        try:
            d['shape_edited'] = bool(f.GetSlabShapeEditor().IsEnabled)
        except Exception:
            d['shape_edited'] = None
        sketch = doc.GetElement(f.SketchId) if f.SketchId != ElementId.InvalidElementId else None
        if sketch is None:
            out['skipped']['floor without sketch'] += 1
        else:
            for arr in sketch.Profile:
                d['loops'].append([curve(c) for c in arr])
        out['floors'].append(d)

    for key, cat in (('doors', BIC.OST_Doors), ('windows', BIC.OST_Windows)):
        for i in FEC(doc).OfCategory(cat).OfClass(FamilyInstance):
            if not isinstance(i.Location, LocationPoint):
                out['skipped'][key + ' without point'] += 1
                continue
            host = i.Host
            out[key].append({'id': eid(i.Id), 'type': type_key(doc, i), 'point': pt(i.Location.Point),
                             'level': named(doc, i.LevelId), 'host': eid(host.Id) if host is not None else None,
                             'host_category': host.Category.Name if host is not None and host.Category else None,
                             'sill': par(i, BIP.INSTANCE_SILL_HEIGHT_PARAM), 'facing_flipped': i.FacingFlipped,
                             'hand_flipped': i.HandFlipped, 'in_place': i.Symbol.Family.IsInPlace,
                             'phase': phases(doc, i)})

    for rm in FEC(doc).OfCategory(BIC.OST_Rooms).WhereElementIsNotElementType():
        if rm.Location is None:
            out['skipped']['unplaced room'] += 1
            continue
        out['rooms'].append({'id': eid(rm.Id), 'name': par(rm, BIP.ROOM_NAME), 'number': par(rm, BIP.ROOM_NUMBER),
                             'point': pt(rm.Location.Point), 'level': named(doc, rm.LevelId), 'area': r(rm.Area),
                             'phase': named(doc, par(rm, BIP.ROOM_PHASE))})

    # Everything the test leaves out, so the result can say what share of the model it covered.
    counts = Counter()
    for e in FEC(doc).WhereElementIsNotElementType():
        c = e.Category
        if c is not None and c.CategoryType == CategoryType.Model:
            counts[c.Name] += 1
    out['model_categories'] = dict(counts)
    out['skipped'] = dict(out['skipped'])
    return out


try:
    app = getattr(__revit__, 'Application', __revit__)
    log('opening ' + model)
    doc = app.OpenDocumentFile(model)
    data = extract(doc)
    with open(os.path.join(OUT, name + '.json'), 'w') as f:
        json.dump(data, f, indent=1)
    log('extracted ' + str({k: len(data[k]) for k in ('levels', 'walls', 'floors', 'doors', 'windows', 'rooms')}))
    doc.Close(False)
    log('done')
except Exception:
    log(traceback.format_exc())
