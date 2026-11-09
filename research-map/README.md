# Research map

The research map of the MaCAD (IAAC) thesis on BIM model generation with AI. The research
question and hypothesis sit at the centre; groups of papers, ideas, images, references and builds sit around it, joined
by links that say what the relation is. It is the single source of the thesis deck, and **the two presentations
(Gensler and IAAC) live inside it**: a menu and a viewer, and the map lights what the slide shown uses.

The repository is private on GitHub. It holds copies of papers and internal presentations, so do not make it public.

## Open it

```
npm install         # once
npm run dev         # http://localhost:4322/ — the map and the paper reader
npm run dev:phone   # the same, plus the phone: prints an https://….ts.net/ address for your tailnet
```

`npm run dev` runs the map's own server (`scripts/serve.mjs`), on this laptop only (127.0.0.1). It serves the folder and
the reader's API: the reading state in `reading/`, the chat (Claude Code, `claude -p`, on your own login) and the note
entries you approve. `npm run dev:phone` also runs `tailscale serve` while the server runs (Tailscale on and signed in on
the laptop and the phone) and stops it with Ctrl+C. Nothing is installed to start on its own; nothing is public.

## Presentations

Press **Presentations** in the toolbar: the menu (left, scrolls) lists Gensler and IAAC with their slides; a slide opens in
the viewer (bottom right). A dot marks the slides that use the map: while one is shown, the nodes it cites are lit, the
rest dims, and the view frames them. A node's panel lists *In presentations*: the slides that use it.

A slide says what it uses with `data-map="id id …"` on its `<section class="slide">`: node ids, group ids, or `question` /
`hypothesis`. No `data-map` = it uses nothing from the map. A new deck: copy the track's latest folder to
`presentations/<track>/presentacion-NN/`, list it in `presentations/assets/site.js`, run `npm run check`.

## The paper reader

Press **Papers** in the toolbar (or **Read** in a paper's panel): the paper opens over the right half of the map, or in
full screen (⤢), in Spanish or English, with its figures where the paper has them (a click enlarges one). The map lights
the paper and what it links to.

- **Listen**: ▶ reads the paper aloud sentence by sentence; select text for *Read from here* or *Read selection*. Edge
  has the natural voices.
- **Underline**: select text → *Underline*. A selection may run across paragraphs and past the edge of the text, which
  scrolls while the mouse stays there; going over an image takes the whole figure, with an outline. Underlines, the place
  you left, the language and the voice are kept in `reading/<node-id>.json`.
- **Ask**: select or underline → *Ask* puts the passage in the chat; then type, or *What did they mean here?*, *Research
  this* (web, other papers, the notes), *About my underlines* (all of them, with your question or without one), *Quiz me ▾* (only when you ask: this underline, section, paper or several).
  Answers come from the paper's idea graph and cite paragraphs (¶ 3.2, a click scrolls there); when the graph has
  nothing, it reads the paper again and adds what it found to the graph. *Across papers* chats with several. Sonnet by
  default, Haiku to compare.
- **Save this** on any message proposes a note entry (in English, your words quoted as written, yours and Claude's
  marked); edit it and *Approve* to append it to the paper's note.
- **Add to the map** on any message proposes a change to `map.json` itself: a new idea or conclusion (title, id, group and its
  note, which becomes `notes/<id>.md`) and the links that join it to papers, ideas, groups or the centre — or only links
  between nodes the map already has. Every field is editable and each link can be unticked; *Approve* writes it, dated today,
  but only if the whole map would still be valid (otherwise nothing is written and the problems are listed). The page shows
  it after a reload. The line endings of `map.json` are kept, so the diff is only the addition. The server never commits:
  the addition is yours to review and commit.

Underlining, the chat and quizzes need `npm run dev` (the map's own server); opened any other way the reader shows text,
figures and voice only.

Preparing a paper (Claude does it, once per paper): `npm run paper:prepare -- <id>` (text and figure crops from the PDF;
`papers/<id>/overrides.json` fixes crops and stray lines), `npm run paper:translate -- <id>` (Spanish, numbers checked),
`npm run paper:graph -- <id>` (the idea graph, Sonnet 5.5 at xhigh). Set `PAPER_EFFORT` (e.g. `high`) to run the last two
at another effort.

Finding papers: the Papers menu searches by word (titles, citations and the text in both languages, not the references),
filters by keywords and by read or unread. Those three commands keep `papers/index.json` and `papers/words.json` up to
date, so a new paper gets all of this by itself. Its keywords come from the vocabulary in `papers/keywords.json`: a keyword
applies when one of its terms is in the title or the text uses its terms at least `min` times. After changing the vocabulary
or repairing a `paper.json` by hand, run `npm run paper:index`, which also lists how many papers each keyword has. What has
been read is in `reading/_library.json`; without the local server the marks are hidden.

## The rule

Claude writes the map from the conversation; the author approves. Nothing is added without a yes. After every change
Claude runs `npm run check` (and `npm test` when code changed) and commits.

## What is where

- `map.json` — the centre (question and hypothesis, each a list of dated versions), groups, nodes and links.
- `notes/<node-id>.md` — each node's log of dated entries (`## YYYY-MM-DD · Summary`, then results, thoughts…).
- `files/` — copies of the PDFs and images the nodes cite; `source.original` keeps where they came from.
- `sources/` — raw reading notes the nodes were written from.
- `assets/` — the viewer (`model.js`, `notes.js`, `layout.js` are pure and tested; `view.js` draws).
- `scripts/check.mjs` — the checker: valid data, every file and note present, every prepared paper and its graph valid,
  `papers/index.json` up to date.
- `papers/<node-id>/` — a prepared paper: `paper.json` (text in blocks, English and Spanish), `fig/` (its figures and
  tables), `graph.json` (its main ideas), `overrides.json` (fixes for the preparation). `reading/` — your reading state.
- `scripts/papers/` — preparing papers; `scripts/serve.mjs` and `scripts/server/` — the local server; `assets/reader-ui.js`,
  `speech.js`, `chat-ui.js` — the reader, its voice and its chat.
- `presentations/` — the two decks (`leaders/` = Gensler, `thesis/` = IAAC), each numbered `presentacion-01`, `-02`…; the
  engine in `presentations/assets/`; `templates/` is the slide gallery. A deck opens on its own at
  `/presentations/<track>/<presentacion-NN>/` (that is how it is presented) and inside the map's viewer with `?embed`.
- `assets/presentations.js` reads the decks (slide titles in both languages and each slide's `data-map`);
  `assets/presentations-ui.js` is the menu and the viewer.
- `scripts/check-presentations.mjs` — the decks' checker: both languages, relative links, the app name never typed, and
  every `data-map` id is in `map.json`. `npm run check` runs both.

Design: `gfit-generative-information-modeler/docs/superpowers/specs/2026-10-18-research-map-design.md`. The paper
reader: `docs/superpowers/specs/2026-10-22-paper-reader-design.md` and its plan in `docs/superpowers/plans/`, here in
this project.
