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

## Pipeline (`pipeline/`)

Revit 2027 + pyRevit (IronPython 2.7) `extract.py` / `rebuild.py`, Python 3 `compare.py`, `run.sh` for the round
trip; JSON in between. See [pipeline/README.md](pipeline/README.md).
