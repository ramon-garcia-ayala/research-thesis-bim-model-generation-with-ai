# Paper reader and study companion inside the research map — design

Date: 2026-10-22 · Status: approved by the author, 2026-10-22 · Plan: `docs/superpowers/plans/2026-10-22-paper-reader.md`

## Intent

The author has ten papers in `files/` (English, dense), finds reading them slow and tedious, and has little time. What
they want is not to have read them but to **learn from them**: the concepts, what other people built, and a critical
view of how each one applies to their practice (Gensler) and, through it, to the MaCAD thesis. The model they named is
Google's NotebookLM: read or listen in Spanish, underline, ask the paper, get quizzed when they ask for it, cross papers.

It lives **inside the research map**, because the map is where the thesis already is: each paper is a node, its note
already reads it against the hypothesis, and what the author learns should be able to flow back into the map.

Success: after working through a paper, the author can explain its main ideas in their own words and argue how it bears
on the question and hypothesis in `map.json`, and the useful bits have become dated entries in the paper's note.

## Decisions (2026-10-22, the author)

| Topic | Decision |
|---|---|
| Where it runs | **All local, on this laptop.** From the phone, through **Tailscale**, only while the laptop is on **and the author has started the app**; nothing on the laptop is changed to keep it always available. Considered and declined: a Vercel deploy (needs access control, a database and an API key; publishes the map and PDFs) and a private claude.ai artifact (lives outside the map). |
| Where it is kept | **Everything in this project, `research-map`**: the code, the prepared papers, the graphs, the reading state and this design. |
| The AI | **Claude Code on the laptop** (`claude -p`), through the author's existing login. No API key, no second app: the author chats **inside the reader** without switching to Claude Desktop or the terminal. |
| Spending | **A graph of each paper's main ideas, built once, answers the questions.** Building it: Claude reads the whole paper once with **Sonnet 5.5 at `xhigh` effort**. Asking: answered from the graph with **Sonnet 5.5 at `low` effort, or Haiku 5.5**. Only when the graph has nothing on the question does Claude go back to the paper's text. |
| Layout | **Both**: a half mode (the map stays on the left, the reader on the right) and a full-screen study mode, with a button to switch. |
| Papers | All ten paper PDFs in `files/`. The eight new ones became map nodes today (commit `036e2cc`): `procthor-2022`, `msd`, `resplan-2026`, `floorplancad-2021`, `pinki-2024`, `cubicasa5k-2019`, `park-2024`, `edgegan-2021`, plus `madireddy-2025` and `comcheck-2025`. |
| Text and figures | Each paper is broken into text plus its figures, tables and diagrams as images, organized and in place. |
| Language | The **text** switches language; **figures stay as images in the original language**. |
| Voice | Reads a selected paragraph, the whole text, or from a chosen point onward; pause and resume. |
| Underlining | The author underlines paragraphs or sentences with the mouse; underlines are kept and can be sent to the chat as references. |
| Chat | Free questions about the text, plus "What did they mean here?" and "Research this" on an underline or selection. Chat with one paper or with several. |
| Quizzes | **Only when the author asks**, never automatically (not at the end of a paper). The author chooses what (an underline, a section, a paper, several papers) and when. |
| Saving to the map | A saved entry is written **in English** like every other note; the author's own words are **quoted as they wrote them** (Spanish included); the entry **says what is the author's and what is Claude's**; from the across-papers chat, the author **picks which note(s)** it goes to. |

## Goals, non-goals, anti-goals

Goals
- Read or listen to any of the ten papers in Spanish or English, with its figures where they belong.
- Underline, ask, research and get quizzed, all inside the reader, cheaply enough to use every day.
- Turn what was learned into proposed entries for the paper's note in the map.

Non-goals
- A reference manager (Zotero), citation export, or annotating the PDF file itself.
- Working while the laptop is off or the app is not started; publishing anything; more than one user.
- Translating the figures.

Anti-goals: it fails, even if it works, when
- it hands the author summaries they read as passively as the PDF;
- a quiz or a question appears without being asked for;
- a translation changes a number, a unit, a name or a claim (the reading notes' rule: numbers as the paper states them);
- an answer about the paper cannot point to where in the paper it comes from;
- every question re-reads a whole paper with a large model;
- anything reaches GitHub or a public URL.

## Constraints (from the repo and the machine)

- **Nothing public, nothing on GitHub.** The repo has no git remote (`scripts/check.mjs` fails if one exists). It does
  sit in a OneDrive folder, so it is backed up to Microsoft's cloud like everything else there, the new folders
  included; that was already the case and is not changed here. What leaves the laptop otherwise: what Claude Code sends
  to Anthropic, and, if the author listens with Edge's natural voices, the text being read, to Microsoft.
- **"Claude writes the map; the author approves."** Anything the reader would add to `map.json` or `notes/` is a
  proposal until the author says yes. After a change Claude runs `npm run check` (and `npm test` when code changed) and
  commits.
- The app is **vanilla ES modules, no framework, no build step**. Pure modules (`model.js`, `notes.js`, `layout.js`,
  `presentations.js`) are tested with vitest + jsdom; `view.js` draws; `presentations-ui.js` is the docked-viewer
  pattern to follow. Light and dark themes through `theme.js` and the tokens in `map.css`. Fonts already loaded: Inter,
  Newsreader (reading text), Geist Mono.
- The machine: Windows 11, Node 24, Claude Code 2.1.308 (`~/.local/bin/claude`, whose `-p` mode takes `--model`,
  `--effort`, `--resume`, `--allowedTools`, `--append-system-prompt`, `--output-format stream-json`), Tailscale
  installed, Python 3.13, poppler's `pdftotext` (but not `pdfimages`/`pdftoppm`), no PyMuPDF. Edge and Chrome. Every PDF
  has a text layer (no OCR needed).
- Size: about 89k words across the ten papers; ProcTHOR is about 23k with its appendix, and the MSD file includes its
  supplement.

## How it fits together

```
files/<paper>.pdf ──(prepare, run by Claude from Claude Code, once per paper)──▶ papers/<node-id>/
                                                                                   paper.json  text blocks, en + es
                                                                                   fig/*.png   figures, tables, diagrams
                                                                                   graph.json  the paper's main ideas
browser (laptop, or phone via Tailscale)
  map + reader ──GET static──▶ scripts/serve.mjs (npm run dev, :4322) ──▶ the repo's files
               ──/api/state──▶                                       ──▶ reading/<node-id>.json (underlines, position…)
               ──/api/chat───▶                                       ──▶ claude -p (graph first, text if needed)
```

### 1. Preparing a paper (offline, once per paper)

- Run by Claude from Claude Code, the same way Claude writes the map; not a button in the app. *(my call: keeps the
  slow, expensive step out of the reader and inside the author's existing review loop)*
- Output in `papers/<node-id>/`, keyed by the **map node id** *(my call on the folder name)*:
  - `paper.json`: the node id, title, cite and source PDF; then sections, each a list of **blocks** (heading,
    paragraph, figure, table, equation, caption) with a **stable id** (e.g. `s3-p2`), the page it came from, and its
    text per language: `{ "en": "…", "es": "…" }`. The references list is its own section.
  - `fig/<block-id>.png`: each figure, table and diagram, cropped from the rendered page. Vector diagrams are not
    embedded images, so figures are cut out of a page render, located by their captions ("Figure 3", "Fig. 3",
    "Table 2"). Tables are kept as images *(my call)*.
  - `graph.json`: the idea graph (part 1b).
- Clean text: reading order across columns, joined hyphenation, no running headers, footers, page or line numbers.
- **Translation** to Spanish by Claude, block by block, with Sonnet 5.5 *(my call on the model)*: numbers, units,
  proper names, citations and dataset or model names unchanged; a technical term keeps its English in parentheses the
  first time it appears *(my call)*. Translations are regenerable output, so they do not need the author's approval
  *(my call)*.
- The shape keys text by language so more languages can be added later; only `en` (original) and `es` are produced now
  *(my call: the presentations already work in that pair)*.
- `npm run check` grows a check: a `papers/<id>/` folder must match a paper node; every block a figure points to must
  have its image; every block id the graph cites must exist in `paper.json`. A paper node without a prepared folder is
  allowed (it simply has no "Read" button).

### 1b. The idea graph (the author's design for spending little)

- **Built once per paper**: Claude reads the full original text with **Sonnet 5.5 at `xhigh` effort** and writes the
  paper's main ideas as a graph. The author's intent: the expensive, careful reading happens once; every later question
  is cheap.
- **What a node is** *(my call on the kinds)*: a concept or definition, a question the paper asks, a method step, a
  dataset, a result (with its numbers exactly as stated), a claim, a limitation, a future-work item. Each node has a
  short statement in English and Spanish and the **block ids it rests on** (its evidence), so every answer can cite
  `¶`.
- **What an edge is**: a typed relation between ideas (e.g. *uses*, *measures*, *supports*, *contradicts*, *part of*,
  *example of*), with one line saying why.
- **The thesis layer** *(my call)*: where an idea bears on the thesis, an edge to the map's `question`, `hypothesis` or
  a node id from `map.json`, with one line; this is what lets the tutor ask the author to argue against the hypothesis
  without re-reading. Ideas shared by several papers (the same dataset, the same metric) carry the same key, so the
  across-papers chat can join graphs.
- The graph is regenerable, derived data: it does not need the author's approval *(my call)*.

### 2. The local server (replaces `http-server`)

- `npm run dev` starts `scripts/serve.mjs` on port 4322. It serves the folder as today (no caching) and adds:
  - **State**: read and write `reading/<node-id>.json`: underlines, the last position, the chosen language and voice,
    chat transcripts and quizzes. Tracked in git like everything else; the server writes files but **never commits**;
    Claude commits them with the next change *(my call)*.
  - **Chat**: runs `claude -p` as described in part 5, streams the answer back, and continues the same conversation on
    the next message.
- **The phone**: started with the app and stopped with it (e.g. `npm run dev:phone` also runs `tailscale serve` in the
  foreground for port 4322, which gives the author's private tailnet an HTTPS address). Nothing is installed to start at
  login, nothing keeps the laptop awake. *(my call on the command; "only when I start it" is the author's)*
- **Safety**: the chat endpoint drives Claude Code on the laptop, so the server listens on **127.0.0.1 only**; the phone
  reaches it only through `tailscale serve`. Claude Code runs with **read-only tools** (read files, search the web,
  fetch pages), never shell or edits; changes to the map are written by the server only after the author's yes (part
  5). *(my calls)*
- Without the server (e.g. the page opened from a plain static server), the reader still shows text, figures and voice;
  underlines, chat and quizzes are hidden.

### 3. The reader

- **Opening it**: a paper node's panel gets **Read** when the paper is prepared; the toolbar gets a **Papers** menu
  listing the prepared papers, beside **Presentations** *(my call)*.
- **Half mode**: the reader is docked over the right half of the stage, the chat below the text and collapsible; the map
  lights the paper's node and the nodes it links to, with the same lit/dim the presentations use. Opening the reader
  closes the presentations viewer and the node panel *(my call)*.
- **Full mode** (study): the reader covers the app in three columns: contents, figures and the author's underlines on the
  left; the text in the middle; the chat on the right.
- A button switches half ↔ full; the choice is remembered. On a phone it is always full, one column, with the chat as a
  sheet from the bottom *(my call)*.
- The bar: paper name · **EN / ES** · voice controls · half/full · close.
- The text is set in Newsreader; each figure sits where the paper puts it, with its caption (translated) under the
  original-language image; a click enlarges it.
- **Selecting text** opens a small menu: *Underline · Ask · ▶ Read from here*.
- **Underlines** belong to a block id and a character range in the language they were made in. In the other language
  the whole paragraph shows a margin mark instead, so an underline is never lost when switching *(my call)*.

The approved mockup: `docs/superpowers/specs/2026-10-22-paper-reader-mockup.html` (both layouts; the author chose both,
with a switch).

### 4. Voice

- The browser's own speech (`speechSynthesis`): free, nothing to install; on the phone it uses the phone's voices.
- A voice picker filtered by the current language, remembered. Chrome on Windows only lists robotic local voices; Edge
  lists Microsoft's "natural" online voices (e.g. Spanish, Mexico): the reader says so once, and the author listens in
  Edge.
- Controls: read all, read from here (a click or a selection sets the start), read only the selection, pause/resume,
  stop, previous/next paragraph, speed 0.75×–2×.
- Reads sentence by sentence (one utterance each, which also avoids the long-utterance cut-off in Chromium), lighting
  the sentence being read and scrolling with it. Figures: reads "Figure 3" and its caption; skips the references.
  Sentence-level light, not word-level, because online voices do not report word boundaries reliably.
- The position is remembered with the rest of the state.

### 5. The study companion (chat and quizzes)

- **One chat per paper**, plus an **across-papers chat** where the author ticks which papers take part.
- An underline or a selection goes into the chat as a quoted chip with its paragraph reference. Over it, the author
  types freely or uses a shortcut:
  - **What did they mean here?** Explains the passage plainly, in context.
  - **Research this.** Looks beyond the paper: the web, the other papers' graphs and the map's notes, and lists its
    sources.
  - **Quiz me ▾.** The author picks the scope (this underline, this section, this paper, several papers). Default kind:
    open questions that ask them to explain, compare, or argue a point against the hypothesis; the author answers in
    the chat and Claude says what was right and what was missing, citing paragraphs. *(the kind is my call)*
- Answers come in the reader's language (Spanish by default) and **cite paragraphs** (`¶ 3.2`) as links that scroll the
  reader there.
- **How a question is answered (graph first)**:
  1. Each call gets: the paper's **graph** (or the ticked papers' graphs); the thesis question and hypothesis; the
     author's underlines and the passage they attached, as text (a passage is small, so "What did they mean here?" never
     needs a re-read); the conversation so far. Model: **Sonnet 5.5 at `low` effort**, with **Haiku 5.5** selectable in
     the reader to compare *(the default is my call; the author named both)*.
  2. If the graph does not cover the question, the model says so instead of guessing, and the server **goes back to the
     text**: the blocks around the closest graph nodes first, the whole paper only if that is not enough, with Sonnet
     5.5 at a higher effort *(my call on the effort)*.
  3. What that re-read finds is **added to the graph**, marked as added from a question, so the same question is cheap
     next time *(my call)*.
- The tutor's stance: explain, then push the author to think; no summaries unless asked.
- **Save this**: on any answer or any of the author's own messages, turns it into a **proposed** dated entry for
  `notes/<id>.md` in the existing format, **in English**, with the author's words **quoted as written**, and saying
  which part is the author's and which is Claude's. From the across-papers chat, the author picks the note(s). The
  proposal is shown in the reader to approve, edit or discard; only on approve does the server append it; Claude runs
  the checks and commits it with the next change. *(the mechanics are my call; the content rules are the author's)*

## Build order (suggested)

1. Prepare one paper (ProcTHOR) end to end — text, figures, translation, graph — and show it in the reader, half and
   full, EN/ES. Then the other nine.
2. Voice.
3. The local server, saved underlines and position; `npm run dev:phone` and the phone layout.
4. Chat (graph first, text if needed), the shortcuts, quizzes, *Save this*.

## Left to the builder

- How text and figures are extracted (pdf.js in Node, PyMuPDF as a dev-only Python tool, poppler…) and how captions
  are matched to figure regions.
- The exact `claude -p` calls (output format, how a conversation is resumed, the tool allow-list) and the streaming
  protocol between server and page.
- How the server decides the graph "does not cover" a question (e.g. a structured answer field) and which blocks it
  re-reads.
- The exact shapes of `paper.json`, `graph.json` and `reading/<id>.json`, the CSS within the existing tokens, keyboard
  shortcuts.
- Tests: the pure parts (block and underline anchoring, the speech queue, the `paper.json` and `graph.json` checks) in
  vitest, as the repo already does.
