# Deck 07 · section "04 · Tests": five slides (spec for the deck session)

Author's request (2026-11-17): the experiments as **five slides**: one that explains the three experiments with no results,
then E1, E2, E3 with the real doors and windows, E3 with the AI's. As visual as possible: 3D models with colours and
indicators that light up step by step, as in decks 04 (`model3d.js`, colour slots lit by the legend) and 06
(`pitch-building.js`, phases). They show **the models as they came out of the experiments**. After these five comes the
existing **"05 · Results"** slide, unchanged.

Order in `presentacion-07/index.html`:

| # | Slide | What it is |
|---|---|---|
| A | `04 · Tests` (the existing slide, rewritten) | the three experiments: process → expected result, **no results** |
| B | `04 · Tests · E1` (new) | tokens, relations, one BFS piece |
| C | `04 · Tests · E2` (new) | the door of that piece hidden and predicted |
| D | `04 · Tests · E3 · real` (new) | the real 107 placed through MCP |
| E | `04 · Tests · E3 · AI` (new) | E2's 107 predictions placed through MCP |
| — | `05 · Results` (existing) | unchanged |

Nothing else is added: no title, index or closing slides.

## Data: where every number and shape comes from

- Merge branch `feat/experiments-masking-mcp` into `feat/presentation-07`. It touches only `pipeline/` and `.gitignore`, and
  brings `pipeline/out/experiments/` (summaries and data). Commit `d7b423c` and later.
- **`pipeline/out/experiments/deck-views.json`** (118 KB, written by `pipeline/experiments/deck_views.py`) holds everything the
  views draw, in the element format of `scripts/deck-model.mjs` `project()`: metres, Revit X and Y in plan, Z up, doors and
  windows with `host`.
  - `models.source`, `models["e3-truth"]`, `models["e3-transformer"]`: the three Revit models (the last two are the files
    saved by E3, read back by `extract.py`; their element ids are the new ones).
  - `e1`: `seed` 152688 (a door, entry level), `nodes` (20 ids **in BFS order**: seed, its wall, …), `edges` (48 relations
    of the piece, `kind` ∈ hosted_by · joins · meets_floor · on_floor), `tokens` (the real tokens of the door and its wall),
    `classes`, `levels`, `numbers`.
  - `e2`: `hidden` 152688, `piece` (the 19 other nodes), `true` and `pred` (class, type, host, point `p` in metres),
    `distance_m` 3.332, `class_ok`/`type_ok`/`host_ok` (all true), `pred.host_prob` 0.752 over `pred.subgraphs_averaged`
    8 pieces, `bars_pct` (class/type/host × transformer/frequency/copy), `numbers`.
  - `e3_truth`, `e3_transformer`: `slots` (new element id → 1–3), `legend` (counts per slot), `links` (transformer only:
    real point → placed point per element, with its slot and `distance_m`), `missing` (the 6 not in the saved model,
    at the point the AI asked for), `numbers`.
  - `slots.e3`: what slots 1–4 mean. `control_rebuild_py`: 83 + 24, 107 hosts.
- Summaries for the footnotes and `.refs`: `pipeline/out/experiments/{e1-tokens-bfs,e2-mask-openings,e3-mcp-place}/summary.json`
  and `pipeline/out/experiments/README.md`.
- **The example is typical, not the best one.** Door 152688 has the right host and type and lands 3.33 m away; across the 66
  elements with the right host, the median distance is 3.36 m (E2 summary, `position_error_when_host_right_m`).
- **Rule:** every figure below comes from these files. If something does not fit, cut it; do not round it into a new claim.

## Graphic language (shared by B–E)

- **Same layout on B–E, pieces in the same place:**
  - Left, a large 3D view (about 60% of the width).
  - Right, a narrow column with the numbered steps `01–03/04` (`data-build`). Each step lights its colour in the view, as
    deck 04's legend does (`.diffs li[data-slot][data-now]`).
  - Under the column, one row of 3–4 numbers.
  - At the bottom, one `stepline__below` line, then `.refs`.
- **Colours: reuse the deck's tokens, no new hues.**
  - Ink for the model: faint for context, solid for what is being told.
  - `--diff-1` (blue) for **what the AI proposes**, and for the seed of the piece.
  - `--diff-3` (green) for **right**, `--diff-4` (amber) for **partly right**, `--diff-2` (orange) for **wrong**.
  - `--ink-tertiary`, dashed, for **missing**. The same meaning on every slide.
- **Camera.**
  - B and C share one camera framed on E1's piece: the 20 nodes' box plus a margin.
  - D and E share another, the whole building, as in deck 04.
  - Moving from B to C and from D to E keeps the view still; only the colours change.
- **Engine.** Extend `assets/model3d.js` (three.js, orbit, shared camera, lit slots) rather than the pitch canvas.
  - A new `data-mode="set"`, with `data-set="e1|e2|e3_truth|e3_transformer"` and `data-side` = a key of `models`.
  - The scene colours elements by the set's slots and lights them by build step.
  - It adds three kinds of drawable: **lines** between element centres (E1 relations, E3 gaps), **markers** at points (E2
    prediction, real door ghost, E3 missing), and a **callout** of token chips (E1).
  - `data-frame="piece"` fits the camera to `e1.nodes`.
  - `deck-model.mjs --deck=presentacion-07` copies `deck-views.json` into the deck's `model.json`, or the deck loads it as
    a second URL.
- **Text:** both languages on every text, `<span lang="en">…</span><span lang="es">…</span>`, with the same marks in each.
  Little text: the view tells it.

## A · `04 · Tests` (rewrite the existing slide)

- **Keep:** `slide--roomy`, the three cards in their places, and the footer line.
- **Remove:** the status chips (`card__status`, "done/running") and `is-pending`. This slide shows no results.

Title: **EN** Three tests, *one for each new step.* · **ES** Tres pruebas, *una por cada paso nuevo.*

| Card | Tag | h3 EN / ES | Process EN / ES | Expected EN / ES |
|---|---|---|---|---|
| 1 (`data-build="1"`) | E1 · 03 | Tokens and pieces / Tokens y piezas | Each element → tokens (class, type, level, position, size, host); the model → a graph → **pieces of 20 by BFS**. / Cada elemento → tokens (clase, tipo, nivel, posición, tamaño, host); el modelo → un grafo → **piezas de 20 por BFS**. | A model written so that a network can read it. / Un modelo escrito para que una red lo pueda leer. |
| 2 (`data-build="2"`) | E2 · 04–05 | Hide and predict / Ocultar y predecir | Hide one door or window in each piece; **a small transformer proposes** its class, type, wall and place. Trained on two storeys, tested on the third. / Ocultar una puerta o ventana en cada pieza; **un transformer pequeño propone** su clase, tipo, muro y lugar. Entrena con dos pisos y prueba con el tercero. | Better than the most frequent answer and than copying another floor. / Mejor que la respuesta más frecuente y que copiar otro piso. |
| 3 (`data-build="3"`) | E3 · 06–07 | Place through MCP / Colocar por MCP | **An MCP server** receives each door and window and Revit places it; `compare.py` judges it at 1 cm. Twice: the real ones, then the AI's. / **Un servidor MCP** recibe cada puerta y ventana y Revit la coloca; `compare.py` la juzga a 1 cm. Dos veces: las reales y luego las de la IA. | The real ones land exactly, as with `rebuild.py`; the AI's show how far it is. / Las reales caen exactas, como con `rebuild.py`; las de la IA muestran qué tan lejos está. |

Footer (`data-build="4"`, keep): One model only, Autodesk's sample: *a test that the pipeline runs, not yet a result about
learning.* / Un solo modelo, el ejemplo de Autodesk: *una prueba de que el pipeline corre, todavía no un resultado sobre aprender.*

`data-map`: `bfs-subgraphs masking-training mcp-assembles-in-revit placement-order-experiments` (as now).

## B · `04 · Tests · E1`

Title: **EN** Each element becomes tokens; *the model, pieces of 20.* · **ES** Cada elemento se vuelve tokens; *el modelo, piezas de 20.*

View: `models.source`, framed on `e1.nodes`. At build 0 the whole building is faint ink.

| Build | Step (right column) EN / ES | The view |
|---|---|---|
| 1 | **01 Tokens** · class, type, level, position (0.5 m bins), size, host / clase, tipo, nivel, posición (bins de 0.5 m), tamaño, host | The door `e1.seed` in blue, with a callout of its 7 real tokens as chips: `CLS:door` · `TYPE:M_Single-Flush \| 0915 x 2134mm` · `LVL:01 - Entry Level` · `X:45` · `Y:14` · `SILL:0` · `HOST:wall` |
| 2 | **02 Relations** · door → its wall, read from Revit; wall–wall, wall–floor, room–floor, from geometry / puerta → su muro, leída de Revit; muro–muro, muro–losa, room–losa, por geometría | Its wall (`e1.nodes[1]`) in solid ink, then the 48 `e1.edges` as lines between element centres: solid for `hosted_by` (from Revit), dashed for the rest (derived) |
| 3 | **03 A piece by BFS** · from one element, ring by ring, until 20 / desde un elemento, anillo por anillo, hasta 20 | The 20 nodes light up in `e1.nodes` order, ring by ring; the rest of the building stays faint |

Numbers row (`e1.numbers`): **394** elements / elementos · **403** tokens · **1,238** relations / relaciones (501 + 737) · **286** distinct pieces / piezas distintas.

Bottom line: **EN** One piece of 286: *15 walls, 2 floors, 2 doors and 1 room, over 2 storeys.* · **ES** Una pieza de 286:
*15 muros, 2 losas, 2 puertas y 1 room, en 2 pisos.* (`e1.classes`, `e1.levels`)

`.refs`: Author, pipeline/out/experiments/e1-tokens-bfs/summary.json, Nov 2026 · Hornung et al. 2025 (pieces of 20 by BFS).
`data-map`: `bfs-subgraphs hornung-2025 ifc-to-graph-recipe`.

## C · `04 · Tests · E2`

Title: **EN** Hide a door: *the AI finds its wall, not its place.* · **ES** Se oculta una puerta: *la IA encuentra su muro, no su lugar.*

View: the same camera as B. The piece (`e2.piece`) in solid ink, the rest faint.

| Build | Step EN / ES | The view |
|---|---|---|
| 1 | **01 Hide** · one door or window; only its level is given / una puerta o ventana; solo se da su nivel | The door is gone; a "?" badge on its storey (not at its place: that would give the answer) |
| 2 | **02 Predict** · a small transformer: class, type, wall, place / un transformer pequeño: clase, tipo, muro, lugar | `e2.pred.host` lit in blue; the predicted door drawn in blue at `e2.pred.p`; chips: door ✓ · M_Single-Flush 0915 x 2134mm ✓ · wall ✓ (75%) |
| 3 | **03 Compare** · with what was hidden / con lo que estaba oculto | The real door as an ink ghost at `e2.true.p`; a line from it to the prediction labelled **3.33 m** |
| 4 | **Over the 107** / **En las 107** | A small bar chart from `e2.bars_pct` (below) |

Bar chart (3 groups × 3 bars, transformer in blue, baselines in faint ink, values printed):

| | transformer | frequency / frecuencia | copy another floor / copiar otro piso |
|---|---|---|---|
| class / clase | 100 | 77.6 | 81.3 |
| type / tipo | 79.4 | 58.9 | 57.9 |
| wall / muro | 61.7 | 29.9 | 32.7 |

Bottom line (build 4): **EN** Type and wall are learned; *the place on the wall is not: 3.36 m, as putting it in the middle
(3.23 m). None within 1 cm.* · **ES** El tipo y el muro se aprenden; *el lugar sobre el muro no: 3.36 m, como ponerla a la
mitad (3.23 m). Ninguna a 1 cm.*

Footnote (small): Small graph transformer, about 127k parameters; three folds, trains on two storeys, tests on the third;
one example, averaged over the 8 pieces that hold it. / Transformer de grafos pequeño, unos 127 mil parámetros; tres
vueltas, entrena con dos pisos y prueba con el tercero; un ejemplo, promediado en las 8 piezas que lo contienen.

`.refs`: Author, pipeline/out/experiments/e2-mask-openings/summary.json, Nov 2026.
`data-map`: `masking-training masklayout-model-pipeline new-not-replicated`.

## D · `04 · Tests · E3 · real`

Title: **EN** Through MCP, *the real doors and windows land exactly.* · **ES** Por MCP, *las puertas y ventanas reales caen exactas.*

View: `models["e3-truth"]`, the whole building, with deck 04's camera.

| Build | Step EN / ES | The view |
|---|---|---|
| 1 | **01 Empty** · rebuilt.rvt without its 107 doors and windows / rebuilt.rvt sin sus 107 puertas y ventanas | Walls and floors only, openings hidden |
| 2 | **02 MCP** · 110 calls: a session, 107 placements, commit, extract / 110 llamadas: una sesión, 107 colocaciones, commit, extract | The openings appear in green (`e3_truth.slots`, all slot 1), storey by storey |
| 3 | **03 Compare at 1 cm** · same place, type and wall / mismo lugar, tipo y muro | All lit; badge **107 / 107**, and "= rebuild.py (no AI)" / "= rebuild.py (sin IA)" |

Right column, under the steps: a small vertical flow, in the style of deck 05's MCP slide: MCP client → MCP server (4 tools)
→ Revit → extract.py → compare.py.

Numbers row: **107/107** at 1 cm / a 1 cm · **107** same type / mismo tipo · **107** same wall / mismo muro · **110** MCP calls / llamadas MCP.

Bottom line: **EN** The route is exact: *it adds no error of its own, so what E3 · AI misses comes from the prediction.* ·
**ES** La ruta es exacta: *no agrega error propio, así que lo que E3 · IA falla viene de la predicción.*

Footnote (small, honest about how it ran): **EN** Our own minimal MCP server. Each commit is applied by one click on a pyRevit
button in an open Revit. The open-source server (pyRevit Routes) closed Revit 2027 twice, and a batch Revit did not get a
licence. · **ES** Servidor MCP propio y mínimo. Cada commit lo aplica un clic en un botón de pyRevit con Revit abierto. El
servidor de código abierto (pyRevit Routes) cerró Revit 2027 dos veces, y un Revit en lote no obtuvo licencia.

`.refs`: Author, pipeline/out/experiments/e3-mcp-place/summary.json, Nov 2026.
`data-map`: `mcp-assembles-in-revit mcp4ifc-2025`.

## E · `04 · Tests · E3 · AI`

Title: **EN** The AI's go in too: *on the right wall 6 times in 10, none at 1 cm.* · **ES** Las de la IA también entran:
*en el muro correcto 6 de cada 10, ninguna a 1 cm.* (62 of 101 = 61%)

View: `models["e3-transformer"]`, the same camera as D. Openings coloured by `e3_transformer.slots`, lit one legend item at
a time (deck 04's mechanism):

| Build | Legend item (`data-slot`) EN / ES | Colour | Count (`legend`) |
|---|---|---|---|
| 1 | Wall and type right / Muro y tipo bien | green `--diff-3` | **50** |
| 2 | Wall right, type wrong / Muro bien, tipo mal | amber `--diff-4` | **12** |
| 3 | Wrong wall / Muro equivocado | orange `--diff-2` | **39** |
| 4 | Not kept by Revit / Revit no las conservó | dashed `--ink-tertiary`, at `missing[].p` | **6** |
| 5 | **The gap** / **La distancia** | the `links`: a line from each real point (faint ink ghost) to its placed one, in its slot's colour | median **6.0 m** |

Numbers row: **102/107** accepted by Revit / aceptadas por Revit · **0** at 1 cm / a 1 cm · **15** within 1 m / a menos de 1 m · **6.0 m** median / mediana.

Bottom line: **EN** Revit accepts the AI's proposals: *it rolls back 5, and 1 placed one is not in the saved model.* The
yardstick is the same as for the real ones. · **ES** Revit acepta las propuestas de la IA: *revierte 5, y 1 colocada no
aparece en el modelo guardado.* La vara es la misma que para las reales.

Footnote: **EN** Counts over the 101 in the saved model; flips are not predicted. · **ES** Cuentas sobre las 101 del modelo
guardado; los giros no se predicen.

`.refs`: Author, pipeline/out/experiments/e3-mcp-place/summary.json and e2-mask-openings/predictions.json, Nov 2026.
`data-map`: `mcp-assembles-in-revit new-not-replicated placement-order-experiments`.

## Checks before committing (deck session)

- `npm run check` and `npx vitest run` pass; every `data-map` id above exists in `map.json` (checked 2026-11-17).
- Layout measured in the browser in both languages, with transitions off before measuring a build: no overflow, and no
  title clashing with the view.
- Every number on B–E traced to `deck-views.json` or a `summary.json`; the counts in E add up (50 + 12 + 39 = 101; + 6 = 107).
