# Research map

The research map of the MaCAD (IAAC) thesis whose case study is GFit: Generative Information Modeler. The research
question and hypothesis sit at the centre; groups of papers, ideas, images, references and builds sit around it, joined
by links that say what the relation is. It is the single source of the weekly thesis deck.

Private and local: this folder has git history for undo and **no remote**. Nothing here goes to GitHub.

## Open it

```
npm install   # once
npm run dev   # http://localhost:4322/
```

## The rule

Claude writes the map from the conversation; the author approves. Nothing is added without a yes. After every change
Claude runs `npm run check` (and `npm test` when code changed) and commits.

## What is where

- `map.json` — the centre (question and hypothesis, each a list of dated versions), groups, nodes and links.
- `notes/<node-id>.md` — each node's log of dated entries (`## YYYY-MM-DD · Summary`, then results, thoughts…).
- `files/` — copies of the PDFs and images the nodes cite; `source.original` keeps where they came from.
- `sources/` — raw reading notes the nodes were written from.
- `assets/` — the viewer (`model.js`, `notes.js`, `layout.js` are pure and tested; `view.js` draws).
- `scripts/check.mjs` — the checker: valid data, every file and note present, no git remote.

Design: `gfit-generative-information-modeler/docs/superpowers/specs/2026-10-18-research-map-design.md`.
