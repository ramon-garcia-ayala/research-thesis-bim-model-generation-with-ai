# Pipeline

Decomposes a Revit model into text and rebuilds it in a new project, with no AI yet. This first test answers one
question: does the text keep what is needed to rebuild the model?

1. `extract.py` writes levels, walls, floors, doors, windows and rooms to JSON (`out/source.json`).
2. `rebuild.py` builds a new project from that JSON (`out/rebuilt.rvt`). It opens the source model only as a library of
   types and families; every placement, level and relation comes from the JSON.
3. `extract.py` runs again on the rebuilt project (`out/rebuilt.json`).
4. `compare.py` compares both JSON files at 1 cm and writes `out/summary.json`.

## Running it

Needs Revit 2027 and pyRevit. The model is `input/source.rvt`, and `out/` keeps the last run's results.

```sh
./run.sh
```

Revit opens and closes by itself, and takes a few minutes. Do not close it while it runs.

`extract.py` and `rebuild.py` run inside Revit (IronPython 2.7); `compare.py` runs on normal Python 3.
Lengths in the JSON stay in Revit's internal feet.

## First result (2026-11-08, Autodesk's `racadvancedsampleproject.rvt`)

| Element | Source | Same position and type |
|---|---|---|
| Levels | 5 | 5 |
| Walls | 180 | 179 |
| Floors | 16 | 14 |
| Doors | 83 | 83, all on the matching wall |
| Windows | 24 | 24, all on the matching wall |
| Rooms | 91 | 91 by name and position, only 37 with the same area (±1%) |

- Wall area rose 5% and floor area 4%, although nearly all of them are in place.
- The tested categories hold 412 of the model's 7,704 elements. Columns, ceilings, furniture, room separation lines and
  18 doors with no location point are left out.
- The likely cause of the room areas is the missing room separation lines. That is not tested yet.
- All 24 windows have their hand orientation inverted. They are one fixed type, so it may not show; not checked by eye.
