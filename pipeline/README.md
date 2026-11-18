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
| Floors | 16 | 16; 2 of them with 7% more area |
| Doors | 83 | 83, all on the matching wall |
| Windows | 24 | 24, all on the matching wall |
| Rooms | 91 | 91 by name and position, only 37 with the same area (±1%) |

- Wall area rose 5% and floor area 4%, although nearly all of them are in place.
- Floors first read 14 of 16: `compare.py` added the area difference to the position gap, so the two floors whose area
  grew (same outline, 0 m apart) counted as out of place. Fixed on 2026-11-09; position and area are now compared
  apart, and `out/diff.json` lists every element that changed, by id.
- The tested categories hold 412 of the model's 7,704 elements. Columns, ceilings, furniture, room separation lines and
  18 doors with no location point are left out.
- The likely cause of the room areas is the missing room separation lines. That is not tested yet.
- All 24 windows have their hand orientation inverted. They are one fixed type, so it may not show; not checked by eye.

## Why the round trip changes areas (diagnosis, 2026-11-17)

Read from `out/` (source, rebuilt, diff): every wall parameter `extract.py` reads comes back the same; the areas change
through what it never reads.

- **Walls lose their cut under slabs and roofs** (+5% wall area): wall attachments and joins to floors and roofs are not
  extracted, so the rebuilt walls run their full height. Basic and curtain walls alike.
- **Rooms merge**: the 76 room separation lines are not extracted, so 5 rooms come back with no area and their
  neighbours grow.
- **Two floors +108.8 m² each**: probably the 2 shaft openings, not rebuilt.
- **Curtain walls are detected** (34, with their types); their grids, panels and mullions are regenerated from the type.
- Doors and windows keep their host (107/107), which is why the experiments start with them.

To make it faithful: read attachments and joins (`WALL_TOP_IS_ATTACHED`, `JoinGeometryUtils`, `LocationCurve` joins),
the separation lines, the shafts, and set them back in `rebuild.py`. Not needed for the door and window experiments.

## Experiments (`experiments/`, results in `out/experiments/`)

Preliminary, on the one sample model: smoke tests of each new step, not results about learning. Each writes
`out/experiments/<id>/summary.json`; `out/experiments/README.md` has one line per run.

| Script | What it does |
|---|---|
| `e1_tokens_bfs.py` | E1: each element as tokens (class, type, level, position in 0.5 m cells, size, host), the graph (hosted by from the JSON; wall–wall, wall–floor, room–floor from geometry) and BFS pieces of up to 20 (a FIFO queue, nearest first; levels are context, not walked) |
| `e2_mask_openings.py` | E2: hide one door or window per piece and predict class, type, host wall and place along it with a small graph transformer (64 numbers per token, 3 layers, 4 heads, about 127 thousand parameters, PyTorch on CPU); three folds by storey; baselines: most frequent, copy another floor. Saves each fold's trained model to `models/<storey>.pt` (weights, settings, vocabulary, fold, loss per epoch); `--from-checkpoint` reloads them without training and checks they give the same predictions |
| `e3_place_via_mcp.py`, `revit_batch_mcp.py`, `e3_revit_place.py`, `e3_compare.py` | E3: an MCP client sends one placement per door or window to an own minimal MCP server; one click on a pyRevit button (`pyrevit/ThesisE3.extension`) applies the queue in the background; `extract.py` and `compare.py` judge it at 1 cm |
| `deck_views.py` | The data the deck 07 slides draw (`out/experiments/deck-views.json`) |

A known weakness of E2: the folds split by storey, and storeys of other buildings may differ; a split that does not
rely on storeys is a next step.
