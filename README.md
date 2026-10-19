# Research map

The research map of the MaCAD (IAAC) thesis whose case study is GFit: Generative Information Modeler. The research
question and hypothesis sit at the centre; groups of papers, ideas, images, references and builds sit around it, joined
by links that say what the relation is. It is the single source of the thesis deck, and **the two presentations
(Gensler and IAAC) live inside it**: a menu and a viewer, and the map lights what the slide shown uses.

Private and local: this folder has git history for undo and **no remote**. Nothing here goes to GitHub.

## Open it

```
npm install   # once
npm run dev   # http://localhost:4322/
```

## Presentations

Press **Presentations** in the toolbar: the menu (left, scrolls) lists Gensler and IAAC with their slides; a slide opens in
the viewer (bottom right). A dot marks the slides that use the map: while one is shown, the nodes it cites are lit, the
rest dims, and the view frames them. A node's panel lists *In presentations*: the slides that use it.

A slide says what it uses with `data-map="id id …"` on its `<section class="slide">`: node ids, group ids, or `question` /
`hypothesis`. No `data-map` = it uses nothing from the map. A new deck: copy the track's latest folder to
`presentations/<track>/presentacion-NN/`, list it in `presentations/assets/site.js`, run `npm run check`.

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
- `presentations/` — the two decks (`leaders/` = Gensler, `thesis/` = IAAC), each numbered `presentacion-01`, `-02`…; the
  engine in `presentations/assets/`; `templates/` is the slide gallery. A deck opens on its own at
  `/presentations/<track>/<presentacion-NN>/` (that is how it is presented) and inside the map's viewer with `?embed`.
- `assets/presentations.js` reads the decks (slide titles in both languages and each slide's `data-map`);
  `assets/presentations-ui.js` is the menu and the viewer.
- `scripts/check-presentations.mjs` — the decks' checker: both languages, relative links, the app name never typed, and
  every `data-map` id is in `map.json`. `npm run check` runs both.

Design: `gfit-generative-information-modeler/docs/superpowers/specs/2026-10-18-research-map-design.md`.
