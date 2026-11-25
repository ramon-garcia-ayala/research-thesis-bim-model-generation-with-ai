# Notes for Claude

The thesis (MaCAD, IAAC): decompose Revit models and regenerate them with AI. Folders and setup: [README.md](README.md).
Speak to the author in Spanish (Mexico); the code, comments and commit messages stay in English.

## Working with the author

- Questions as multiple choice, always one option marked *(Recomendado)*.
- Presentations: one idea per slide, process → expected result, little text, room to breathe. Slides that tell one
  story share one graphic language and keep their pieces at the same place.
- Never invent numbers or sample counts: every figure on a slide comes from `pipeline/out/` or from a paper read.
- Commit only the work of the session. The author's own changes (reading progress, `notes/`, `map.json` edits) stay
  out unless asked. Branch first; never commit to `master`.

## Commands (from `research-map/`)

- `npm run dev` — the map and the decks at http://127.0.0.1:4322/ (if the port is taken, one is already running).
- `npm run check` — the map and the decks' checker. `npx vitest run` — the tests. Both pass before a commit.
- `node scripts/deck-model.mjs` — rebuilds a deck's `model.json` (the 3D views) from `pipeline/out/`.

## Decks (`research-map/presentations/`)

- Every text in both languages: `<span lang="en">…</span><span lang="es">…</span>`, the same marks in each.
- `data-map` ids must exist in `map.json`; external links only in `.refs`.
- Components live in `assets/deck.css`; colours as tokens, light and dark. Builds, key words and transitions: see
  `research-map/README.md` § Presentations.
- Layout is checked by measuring in the browser (overflow, a title clashing with the diagram), in both languages:
  screenshots of the deck time out in Claude in Chrome here. Turn transitions off before measuring a build.
- From deck 07 on: chapters (a `slide--chapter` cover, `data-chapter` / `data-chapter-es` on every slide; the bar groups
  the dots by chapter) and speaker notes in `<aside class="notes">` on every slide, with key words, for the presenter
  view (⧉ or P). One slide per part the author lists; the diagram over the text.

## Pipeline (`pipeline/`)

Revit 2027 + pyRevit (IronPython 2.7) `extract.py` / `rebuild.py`, Python 3 `compare.py`, `run.sh` for the round
trip; JSON in between. See [pipeline/README.md](pipeline/README.md).

Direction approved by the supervisor (2026-11-10): step 04 learns by **masking** (hide part of a model, the AI predicts
it; not necessarily a GNN) and step 05 assembles through an **MCP server for Revit**, with `rebuild.py` kept as the
no-AI control. Experiments: place everything at once, one by one, or one and then its neighbours; and how to tell
"new" from "copied". Research question (2026-11-18, after the advisor asked for something less abstract than
"meaningful parts"): "Can BIM models be decomposed into rooms and their relations to generate new, valid models?" It
is in `research-map/map.json`; decks 01–07 keep the question of their day. Advisor feedback (2026-11-18): the target
is the room (pyramid element → relation → room → plan → building); define diversity, then the prediction strategy,
then rebuild the graph from rooms (bounds, adjacency, access); the MCP becomes a validator, not the assembler; more
models from the office, split by building. The answers for the advisor, to keep working on:
https://claude.ai/artifact/SKjfZvQfGCL9gpa4br2PRm ("Answers for the advisor session", a Claude Docs doc; read and edit
it through the docs connector). The
last deck is `presentacion-08`: the midterm Pecha Kucha (15 × 20 s, English only), written as a paper in five sections
(introduction, research question, related work — Tang 2024 and Building-Graph-AI 2025 —, method, results so far); its
building has a `rooms` phase that marks the sample's 91 rooms. `presentacion-09` is the same pitch in deck 07's look
(`<body data-pitch data-look="deck">`: no builds, pieces come in by `--at`, 3D views step along the slide's clock with
`data-steps-at="3,6.5,10"`), 16 slides (a thanks after the five sections), the results told as prior work at the
element level and the flaw of the repeated storeys; the author works on 09. Before it, `presentacion-07` (first tests, 2026-11-18): E1–E3 on the sample model, its numbers from
`pipeline/out/experiments/` (`node scripts/deck-model.mjs --deck=presentacion-07 --views` refreshes them). Its next
steps: the same model, changing the parameters (how much and what to hide, a split that does not rely on storeys, a
larger network, the order of placing).
