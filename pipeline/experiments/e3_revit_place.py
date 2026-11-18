# -*- coding: utf-8 -*-
# E3 · Revit side of the batch MCP server (revit_batch_mcp.py). Runs inside Revit through `pyrevit run` (IronPython 2.7):
#   pyrevit run e3_revit_place.py <base model> --revit=2027 --purge
# Reads the job the MCP server wrote (out/e3/job.json): opens the base model, deletes every door and window, places the
# queued family instances on the host wall given by id, saves as the job's out_path and writes out/e3/report.json.
# Same transaction and warning handling as rebuild.py, which placed 107/107 openings this way.
import json, os, traceback
from collections import Counter
import clr
clr.AddReference('System')
import System
from System.Collections.Generic import List
from Autodesk.Revit.DB import (BuiltInCategory as BIC, BuiltInParameter as BIP, ElementId, FailureProcessingResult,
                               FailureSeverity, FamilySymbol, FilteredElementCollector as FEC, IFailuresPreprocessor,
                               Level, SaveAsOptions, Transaction, XYZ)
from Autodesk.Revit.DB.Structure import StructuralType

BASE = os.path.dirname(os.path.abspath(__file__))
E3 = os.path.join(BASE, '..', 'out', 'e3')
report = {'placed': [], 'revit_messages': Counter(), 'deleted_openings': 0}


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
        return FailureProcessingResult.ProceedWithCommit if resolved else FailureProcessingResult.Continue


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
            self.t.Commit()
        else:
            self.t.RollBack()
        return False


def eid(i):
    return int(str(i.Value)) if hasattr(i, 'Value') else i.IntegerValue


def key_of(t):
    p = t.get_Parameter(BIP.ALL_MODEL_TYPE_NAME) or t.get_Parameter(BIP.SYMBOL_NAME_PARAM)
    return (t.FamilyName, p.AsString() if p else None)


try:
    app = getattr(__revit__, 'Application', __revit__)
    with open(os.path.join(E3, 'job.json')) as f:
        job = json.load(f)
    report['job_items'] = len(job['items'])
    doc = app.OpenDocumentFile(__models__[0])
    report['base_model'] = doc.PathName

    ids = List[ElementId]()
    for cat in (BIC.OST_Doors, BIC.OST_Windows):
        for i in FEC(doc).OfCategory(cat).WhereElementIsNotElementType().ToElementIds():
            ids.Add(i)
    with Tx(doc, 'E3 delete openings'):
        doc.Delete(ids)
    report['deleted_openings'] = ids.Count

    types = {}
    for t in FEC(doc).OfClass(FamilySymbol):
        types[key_of(t)] = t
    levels = dict((l.Name, l) for l in FEC(doc).OfClass(Level))

    for it in job['items']:
        row = {'tag': it.get('tag'), 'ok': False}
        try:
            sym = types.get((it['family'], it['type_name']))
            host = doc.GetElement(ElementId(System.Int64(int(it['host_wall_id']))))
            lvl = levels.get(it['level'])
            if sym is None or host is None or lvl is None:
                row['why'] = 'missing type' if sym is None else 'missing host' if host is None else 'missing level'
            else:
                with Tx(doc, 'E3 place'):
                    if not sym.IsActive:
                        sym.Activate()
                        doc.Regenerate()
                    n = doc.Create.NewFamilyInstance(XYZ(it['x'], it['y'], it['z']), sym, host, lvl,
                                                     StructuralType.NonStructural)
                    doc.Regenerate()
                    if it.get('sill') is not None:
                        s = n.get_Parameter(BIP.INSTANCE_SILL_HEIGHT_PARAM)
                        if s is not None and not s.IsReadOnly:
                            s.Set(float(it['sill']))
                    if it.get('facing_flipped') is not None and n.CanFlipFacing and \
                            n.FacingFlipped != it['facing_flipped']:
                        n.flipFacing()
                    if it.get('hand_flipped') is not None and n.CanFlipHand and n.HandFlipped != it['hand_flipped']:
                        n.flipHand()
                    new_id = eid(n.Id)
                placed = doc.GetElement(ElementId(System.Int64(new_id)))
                if placed is None:
                    row['why'] = 'rolled back by Revit'
                else:
                    row.update({'ok': True, 'new_id': new_id, 'host': eid(placed.Host.Id) if placed.Host else None})
        except Exception as e:
            row['why'] = str(e)[:200]
        report['placed'].append(row)

    o = SaveAsOptions()
    o.OverwriteExistingFile = True
    doc.SaveAs(job['out_path'], o)
    report['saved_as'] = job['out_path']
    doc.Close(False)
except Exception:
    report['error'] = traceback.format_exc()
finally:
    report['revit_messages'] = dict(report['revit_messages'])
    with open(os.path.join(E3, 'report.json'), 'w') as f:
        json.dump(report, f, indent=1)
