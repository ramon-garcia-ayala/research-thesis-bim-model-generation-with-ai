# Paper Reader and Study Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reader inside the research map that shows each paper as clean text plus cropped figures, in English or Spanish, reads it aloud, keeps the author's underlines, and lets them chat with one or several papers (answered from a per-paper idea graph), get quizzed on demand, and save what they learn into the paper's note.

**Architecture:** Papers are prepared offline by scripts Claude runs from Claude Code (`scripts/papers/`): PyMuPDF dumps the PDF, pure JS turns the dump into `papers/<id>/paper.json` + `fig/*.png`, `claude -p` translates it and builds `graph.json`. A small Node server (`scripts/serve.mjs`, replacing `http-server`) serves the map as before and adds `/api/*` for the reading state, the chat (graph first, re-read if needed) and approved note entries. The reader is vanilla ES modules mounted by `view.js`, like the presentations viewer.

**Tech Stack:** vanilla ES modules (no framework, no build), Node 24 (`node:http`, `node:child_process`), vitest + jsdom, Python 3.13 + PyMuPDF (dev-only, preparation), Claude Code 2.1.308 `claude -p`, Web Speech API, Tailscale.

**Spec:** `docs/superpowers/specs/2026-10-22-paper-reader-design.md` (approved 2026-10-22). Mockup: `docs/superpowers/specs/2026-10-22-paper-reader-mockup.html`.

## Global Constraints

- Everything lives in `research-map`. No git remote, nothing public; `scripts/check.mjs` keeps failing on a remote.
- No framework, no bundler, no new runtime npm dependency. PyMuPDF is installed for the author only (`python -m pip install --user pymupdf`) and only the preparation scripts use it. `http-server` is removed.
- Every Python run on a PDF: `python -I scripts/papers/pdf_dump.py …`.
- Every `claude -p` call: prompt on stdin, `--no-session-persistence --setting-sources "" --strict-mcp-config`, an explicit `--tools` list (`""` = none). Binary: `process.env.CLAUDE_BIN` or `claude`.
- Models, exactly: graph build `claude-sonnet-5-5` + `--effort xhigh`; translation `claude-sonnet-5-5` + `--effort medium`; chat default `claude-sonnet-5-5` + `--effort low`; chat alternative `claude-haiku-5-5` (no `--effort`); re-read `claude-sonnet-5-5` + `--effort medium`.
- Research mode tools: `Read,Grep,Glob,WebSearch,WebFetch`, cwd = repo root. Never `Bash`, `Edit`, `Write`.
- Server listens on `127.0.0.1:4322` only; the phone reaches it through `tailscale serve`, started with the app and stopped with it.
- Languages: `en` (original) and `es`. Figures are never translated; captions are. Translation keeps numbers, units, proper names, citations, dataset and model names unchanged; a technical term keeps its English in parentheses the first time.
- Reader labels follow the reader's EN/ES switch. Map labels stay as they are (English).
- Saved note entries: `## YYYY-MM-DD · Reading`, written in English, the author's words quoted as written, each part marked as the author's or Claude's; appended only after the author approves in the reader.
- The server writes files and never commits. Before every commit: `npm run check` and `npm test` pass. Commit messages follow the repo's `Area: what changed` style and end with `Claude-Session: https://claude.ai/code/session_011Uw9vNRdRsyWHeQsyKMjVG`.
- Light and dark: only the tokens in `assets/map.css` (`--panel`, `--ink`, `--separator`, `--font-serif`…). Reader CSS goes in a new `assets/reader.css`.

## Review Focus

1. **The page opened without the server** (old static server, a file preview): the reader must show text, figures and voice, and hide underlining, chat and quizzes without errors. Tests in Task 8 (no client) and Task 12 (`client.available()` false).
2. **`claude` fails** (not logged in, rate limit, non-zero exit, killed): the chat shows the error and stores no assistant message; a failed graph build leaves the old `graph.json` untouched. Tests in Tasks 7 and 15.
3. **A request to `/api/*` from another site** (a page in the author's browser posting to `localhost:4322`, or a DNS-rebound host): rejected with 403 before anything runs. Test in Task 11.
4. **Switching language or closing the reader while it speaks**: speech stops; on a language switch it resumes at the same block in the other language. Test in Task 10.
5. **A figure whose crop is missing or a caption that matched nothing**: the text still renders, the figure shows its caption without a broken image, and `npm run check` names the missing file. Tests in Tasks 1 and 8.

---

## Data contracts (used by every task)

`papers/<node-id>/paper.json`
```json
{ "version": 1, "node": "procthor-2022", "title": "ProcTHOR: …", "source": "files/ProcTHOR - ….pdf",
  "sections": [
    { "id": "s3", "title": { "en": "3 Procedural generation", "es": "3 Generación procedural" },
      "blocks": [
        { "id": "s3-p2", "type": "paragraph", "page": 4, "text": { "en": "…", "es": "…" } },
        { "id": "fig-3", "type": "figure", "page": 5, "image": "fig/fig-3.png", "text": { "en": "Figure 3: …", "es": "Figura 3: …" } } ] },
    { "id": "refs", "title": { "en": "References" }, "blocks": [ … ] } ] }
```
Block `type` ∈ `heading | paragraph | figure | table | equation`. `figure` and `table` carry `image`. `es` may be missing (not translated yet, references, equations); readers fall back to `en`.

`papers/<node-id>/graph.json`
```json
{ "version": 1, "node": "procthor-2022", "built": { "date": "2026-10-22", "model": "claude-sonnet-5-5", "effort": "xhigh" },
  "ideas": [ { "id": "i1", "kind": "method", "key": "validator", "en": "…", "es": "…", "blocks": ["s3-p2"], "origin": "read" } ],
  "edges": [ { "from": "i1", "to": "i2", "type": "supports", "why": "…" } ],
  "thesis": [ { "idea": "i1", "to": "correct-by-construction", "why": "…" } ] }
```
Idea `kind` ∈ `concept | question | method | dataset | result | claim | limitation | future`; edge `type` ∈ `uses | measures | supports | contradicts | part-of | example-of`; `origin` ∈ `read | question` (a `question` idea also has `date`); `thesis[].to` is `question`, `hypothesis` or a map node id; `key` is optional kebab-case shared across papers.

`papers/index.json` — `{ "papers": [ { "node": "procthor-2022", "title": "…", "figures": 7, "es": true, "graph": true } ] }`, always equal to what the folders hold (recomputed by the scripts, compared by the checker).

`reading/<node-id>.json` (and `reading/_across.json` for the across-papers chat)
```json
{ "version": 1, "position": { "block": "s3-p2", "sentence": 0 }, "lang": "es", "voice": null, "rate": 1,
  "underlines": [ { "id": "u1", "block": "s3-p2", "lang": "es", "start": 0, "end": 120, "text": "…", "date": "2026-10-22" } ],
  "chats": [ { "id": "c1", "papers": ["procthor-2022"], "messages": [
      { "role": "user", "mode": "ask", "text": "…", "attach": [ { "block": "s3-p2", "text": "…" } ], "date": "2026-10-22" },
      { "role": "assistant", "text": "… [¶ s3-p2] …", "date": "2026-10-22" } ] } ] }
```

---

### Task 1: The paper data contract and its check

**Files:**
- Create: `assets/paper.js`
- Modify: `scripts/check.mjs` (add the `papers/` checks to `checkFolder`)
- Create: `tests/fixture/papers/sample-a/paper.json`, `tests/fixture/papers/sample-a/graph.json`, `tests/fixture/papers/sample-a/fig/fig-1.png` (any 1×1 PNG), `tests/fixture/papers/index.json`
- Test: `tests/paper.test.js`, `tests/check.test.js` (add cases)

**Interfaces:**
- Produces (`assets/paper.js`, pure, browser + Node):
  - `LANGS = ['en','es']`, `BLOCK_TYPES`, `IDEA_KINDS`, `EDGE_TYPES` (values in Data contracts)
  - `validatePaper(paper, nodeId: string) -> string[]`
  - `validateGraph(graph, paper, mapIds: Set<string>) -> string[]`
  - `blocksOf(paper) -> Block[]` (flat, document order, each with `section` id added)
  - `textOf(blockOrSection, lang) -> string` (`text[lang] ?? text.en`, or `title[lang] ?? title.en`)
  - `paraLabel(paper, blockId) -> string` (`"3.2"`: 1-based section index, 1-based index among that section's paragraphs; figures `"Fig. 3"`, tables `"Table 2"`)
  - `sentences(text) -> Array<{start: number, end: number}>`
  - `mergeIdeas(graph, ideas, date) -> graph` (new ideas get the next free `i<n>` ids, `origin: 'question'`, `date`; returns a new object)
- Produces (`scripts/check.mjs`): `checkFolder` also reports paper problems; `indexPapers(dir) -> {papers: [...]}` exported for Task 4.

- [ ] **Step 1: Write the failing tests**

`tests/paper.test.js` (fixture loaded from `tests/fixture/papers/sample-a/`, two sections `s1`, `s2`; `s2` has `s2-p1`, `fig-1`, `s2-p2`):
```js
it('accepts the fixture paper', () => expect(validatePaper(paper, 'sample-a')).toEqual([]))
it('names a duplicate block id', () => expect(validatePaper(dup(paper, 's2-p1'), 'sample-a')).toContain('block "s2-p1": duplicate id'))
it('names a figure without image', () => expect(validatePaper(noImage(paper, 'fig-1'), 'sample-a')).toContain('block "fig-1": a figure needs an image'))
it('names a node mismatch', () => expect(validatePaper(paper, 'other')).toContain('paper.json is for "sample-a", not "other"'))
it('names an unknown block type', () => expect(validatePaper(withType(paper, 's2-p1', 'poem'), 'sample-a')).toContain('block "s2-p1": type "poem" is not one of heading, paragraph, figure, table, equation'))
it('accepts the fixture graph', () => expect(validateGraph(graph, paper, new Set(['sample-b']))).toEqual([]))
it('names an idea citing a missing block', () => expect(validateGraph(cites(graph, 'i1', ['s9-p9']), paper, ids)).toContain('idea "i1": block "s9-p9" is not in paper.json'))
it('names a thesis link to an unknown map id', () => expect(validateGraph(thesisTo(graph, 'nope'), paper, ids)).toContain('thesis "i1" → "nope": not question, hypothesis or a map node'))
it('labels paragraphs and figures', () => {
  expect(paraLabel(paper, 's2-p2')).toBe('2.2')
  expect(paraLabel(paper, 'fig-1')).toBe('Fig. 1')
})
it('falls back to English', () => expect(textOf({ text: { en: 'Hi' } }, 'es')).toBe('Hi'))
it('splits sentences without breaking abbreviations or decimals', () => {
  const t = 'A grid of 0.25 m is used, e.g. in Fig. 3. Deitke et al. report 31.4%. ¿Funciona? Sí.'
  expect(sentences(t).map(({ start, end }) => t.slice(start, end).trim())).toEqual([
    'A grid of 0.25 m is used, e.g. in Fig. 3.', 'Deitke et al. report 31.4%.', '¿Funciona?', 'Sí.'])
})
it('merges new ideas after the existing ones', () => {
  const g = mergeIdeas(graph, [{ kind: 'claim', en: 'x', es: 'x', blocks: ['s2-p1'] }], '2026-10-23')
  expect(g.ideas.at(-1)).toMatchObject({ id: `i${graph.ideas.length + 1}`, origin: 'question', date: '2026-10-23' })
  expect(graph.ideas.length).toBe(g.ideas.length - 1)
})
```
`tests/check.test.js` (new cases, using the existing `folder()` helper plus a `papers/<id>/` tree):
```js
it('passes a prepared paper', …)                       // expect(checkFolder(dir, { gitRemote: noRemote })).toEqual([])
it('names a papers folder with no paper node', …)      // 'papers/ghost: no paper node has this id'
it('names a missing figure image', …)                  // 'papers/procthor/paper.json: fig/fig-1.png is missing'
it('names an invalid graph', …)                        // starts with 'papers/procthor/graph.json: '
it('names a stale papers/index.json', …)               // 'papers/index.json does not match the papers folders'
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/paper.test.js tests/check.test.js`
Expected: FAIL (`assets/paper.js` does not exist; the new check cases fail).

- [ ] **Step 3: Implement `assets/paper.js` and the checks**

`sentences`: split after `.`, `!`, `?` (and `…`) followed by whitespace, except when the token before the dot is a number (`0.25`), a single letter or one of `e.g i.e et al Fig Figs Eq Eqs Tab vs cf approx No Sec`; an opening `¿`/`¡` starts a sentence. `checkFolder`: for each directory in `papers/` — node exists with `kind: 'paper'`, `validatePaper`, every `image` exists, `validateGraph` when `graph.json` exists (map ids = node ids), and `papers/index.json` deep-equals `indexPapers(dir)` when any paper folder exists.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/paper.test.js tests/check.test.js && npm run check`
Expected: PASS; `map OK`.

- [ ] **Step 5: Commit**

```bash
git add assets/paper.js scripts/check.mjs tests/paper.test.js tests/check.test.js tests/fixture/papers
git commit -m "Reader: the paper and graph contract, checked"
```

### Task 2: The PDF dump and crop tool

**Files:**
- Create: `scripts/papers/pdf_dump.py`
- Test: `tests/papers/pdf-dump.test.js`

**Interfaces:**
- Produces: `python -I scripts/papers/pdf_dump.py dump <pdf> <out.json>` writes `{ "pages": [ { "n": 1, "w": 612, "h": 792, "blocks": [ { "bbox": [x0,y0,x1,y1], "lines": [ { "text": "…", "size": 9.96, "bold": false } ] } ], "images": [[x0,y0,x1,y1]], "drawings": [[x0,y0,x1,y1]] } ] }` (text blocks from `page.get_text('dict')`, images from `page.get_image_info()`, drawings from `page.get_drawings()` rects merged when they overlap).
- Produces: `python -I scripts/papers/pdf_dump.py crop <pdf> <crops.json> <outdir> [--dpi 200]` renders each `{ "id", "page", "bbox" }` with `page.get_pixmap(clip=…, dpi=…)` to `<outdir>/<id>.png`.

- [ ] **Step 1: Install PyMuPDF for the author**

Run: `python -m pip install --user pymupdf && python -I -c "import fitz; print(fitz.__doc__)"`
Expected: a PyMuPDF version line.

- [ ] **Step 2: Write the failing test**

The test builds a PDF with PyMuPDF itself (two text lines and one filled rectangle on page 1) in `mkdtempSync`, then:
```js
const hasFitz = spawnSync('python', ['-I', '-c', 'import fitz']).status === 0
describe.skipIf(!hasFitz)('pdf_dump.py', () => {
  it('dumps text blocks with sizes and the drawn rectangle', () => {
    const raw = JSON.parse(readFileSync(out, 'utf8'))
    expect(raw.pages[0].blocks.flatMap((b) => b.lines.map((l) => l.text))).toEqual(['A heading', 'Body text here.'])
    expect(raw.pages[0].drawings).toHaveLength(1)
  })
  it('crops a region to a PNG', () => expect(readFileSync(join(figs, 'fig-1.png')).subarray(1, 4).toString()).toBe('PNG'))
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/papers/pdf-dump.test.js`
Expected: FAIL (script missing).

- [ ] **Step 4: Implement `scripts/papers/pdf_dump.py`**

Standard library + `fitz` only; `argparse` with the two subcommands; JSON written UTF-8 with `ensure_ascii=False`; coordinates rounded to 0.1 pt.

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/papers/pdf-dump.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/papers/pdf_dump.py tests/papers/pdf-dump.test.js
git commit -m "Reader: dump and crop PDFs with PyMuPDF"
```

### Task 3: From the dump to blocks, sections and figure regions

**Files:**
- Create: `scripts/papers/structure.mjs`
- Test: `tests/papers/structure.test.js`

**Interfaces:**
- Consumes: the dump shape (Task 2); `BLOCK_TYPES` (Task 1).
- Produces:
  - `dropRunning(pages) -> pages` — removes lines repeated in the top or bottom 8% of the page on at least half the pages (headers, footers), bare page numbers, and the arXiv side stamp (`^arXiv:\d{4}\.\d{4,5}`).
  - `orderBlocks(page) -> block[]` — full-width blocks (wider than 60% of the page) split the page into bands; inside a band, the left column (centre x < page mid) before the right, each top to bottom.
  - `joinLines(lines: string[]) -> string` — joins with spaces; `word-\nnext` becomes `wordnext` unless the part before `-` is capitalised or a number.
  - `captionOf(text) -> { kind: 'figure'|'table', n: number } | null` — `^(Figure|Fig\.)\s*(\d+)[.:]` or `^Table\s*(\d+)[.:]`.
  - `figureRegion(page, caption, kind) -> [x0,y0,x1,y1]` — figure: the gap above the caption; table: the gap below it; the gap is bounded by the nearest text block of that column and limited horizontally to the caption's column (or the page when the caption is full-width); the result is the union of `images`/`drawings` rects inside the gap, or the whole gap when none.
  - `structure(raw, { node, title, source, overrides }) -> { paper, crops }` — headings are blocks whose font size is ≥ 1.15 × the body size (the most common size) or that are bold and match `^\d+(\.\d+)*\s+\S`; a numbered top-level heading opens a new section `s<n>`; `References`/`Bibliography` opens section `refs`; figure and table blocks get ids `fig-<n>`/`tab-<n>` and `image: 'fig/<id>.png'`; `overrides = { drop: string[] /* regexes */, crops: { [id]: { page, bbox } } }` removes matching lines and replaces crops.

- [ ] **Step 1: Write the failing tests**

Synthetic dumps built in the test (no PDF):
```js
it('drops a header repeated on every page and the page numbers', () => expect(texts(dropRunning(pages))).not.toContain('Preprint. Under review.'))
it('reads the left column before the right one', () => expect(orderBlocks(twoColumnPage).map(first)).toEqual(['Title', 'L1', 'L2', 'R1', 'R2']))
it('joins hyphenated words but keeps real hyphens', () => {
  expect(joinLines(['procedu-', 'ral generation'])).toBe('procedural generation')
  expect(joinLines(['Multi-', 'Task model'])).toBe('Multi-Task model')
})
it('recognises figure and table captions', () => {
  expect(captionOf('Fig. 3: Stages of generation')).toEqual({ kind: 'figure', n: 3 })
  expect(captionOf('Table 2. Results')).toEqual({ kind: 'table', n: 2 })
  expect(captionOf('Figures show…')).toBeNull()
})
it('crops a figure to the drawings above its caption, inside its column', () => expect(figureRegion(page, caption, 'figure')).toEqual([40, 120, 290, 300]))
it('builds sections, paragraphs, figures and the references section', () => {
  const { paper, crops } = structure(raw, { node: 'sample-a', title: 'Sample', source: 'files/sample-a.pdf', overrides: {} })
  expect(validatePaper(paper, 'sample-a')).toEqual([])
  expect(paper.sections.map((s) => s.id)).toEqual(['s1', 's2', 'refs'])
  expect(crops).toEqual([{ id: 'fig-1', page: 2, bbox: [40, 120, 290, 300] }])
})
it('applies overrides', () => …) // a dropped line disappears; an overridden crop replaces the computed one
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/papers/structure.test.js` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `scripts/papers/structure.mjs`** with the signatures and rules above.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/papers/structure.test.js` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/papers/structure.mjs tests/papers/structure.test.js
git commit -m "Reader: turn a PDF dump into sections, paragraphs and figure crops"
```

### Task 4: `prepare` — ProcTHOR in English, with its figures

**Files:**
- Create: `scripts/papers/prepare.mjs`
- Modify: `package.json` (script `"paper:prepare": "node scripts/papers/prepare.mjs"`)
- Create (output): `papers/procthor-2022/paper.json`, `papers/procthor-2022/fig/*.png`, `papers/procthor-2022/overrides.json` (only if needed), `papers/index.json`
- Test: `tests/papers/prepare.test.js`

**Interfaces:**
- Consumes: `structure` (Task 3); `validatePaper` (Task 1); `indexPapers` (Task 1, `scripts/check.mjs`).
- Produces: `prepare(nodeId, { root, dump, crop }) -> Promise<{ sections: number, blocks: number, figures: number }>` where `dump(pdf, outJson)` and `crop(pdf, cropsJson, outDir)` default to running `pdf_dump.py`; it writes the raw dump to the OS temp folder (never into the repo), keeps any `es` text already in an existing `paper.json` for blocks whose id and English text did not change, writes `paper.json`, the crops, and `papers/index.json` (`indexPapers(root)`). CLI: `node scripts/papers/prepare.mjs <node-id>` prints the summary and the figure list.

- [ ] **Step 1: Write the failing test**

Injected `dump`/`crop` fakes write the Task 3 synthetic dump and empty PNGs into a temp copy of `tests/fixture/`:
```js
it('writes paper.json, the figures and the index', async () => {
  const r = await prepare('sample-a', { root, dump, crop })
  expect(r).toEqual({ sections: 3, blocks: expect.any(Number), figures: 1 })
  expect(existsSync(join(root, 'papers/sample-a/fig/fig-1.png'))).toBe(true)
  expect(JSON.parse(readFileSync(join(root, 'papers/index.json'), 'utf8')).papers[0]).toMatchObject({ node: 'sample-a', es: false, graph: false })
})
it('keeps an unchanged translation when run again', …)
it('refuses a node that is not a paper', () => expect(prepare('idea-1', { root, dump, crop })).rejects.toThrow('"idea-1" is not a paper node'))
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run tests/papers/prepare.test.js` → FAIL.

- [ ] **Step 3: Implement `scripts/papers/prepare.mjs`.**

- [ ] **Step 4: Run it to verify it passes** — same command → PASS.

- [ ] **Step 5: Prepare ProcTHOR and review it by eye**

Run: `npm run paper:prepare -- procthor-2022`
Then open every `papers/procthor-2022/fig/*.png` with the Read tool and compare a few paragraphs with the PDF. Fix wrong crops or leftover headers through `papers/procthor-2022/overrides.json` and run again until every figure is whole and no running header remains.
Expected: `npm run check` → `map OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/papers/prepare.mjs tests/papers/prepare.test.js package.json papers/
git commit -m "Reader: prepare a paper; ProcTHOR's text and figures"
```

### Task 5: The `claude -p` runner

**Files:**
- Create: `scripts/lib/claude.mjs`
- Create: `tests/fixture/fake-claude.mjs`
- Test: `tests/claude.test.js`

**Interfaces:**
- Produces:
  - `claudeArgs({ model, effort, tools = [], system, stream = false }) -> string[]` — always `-p --model <m> --no-session-persistence --setting-sources "" --strict-mcp-config --tools <tools.join(',') or "">`; `--effort <e>` when given; `--append-system-prompt <system>` when given; `stream` → `--output-format stream-json --verbose --include-partial-messages`, else `--output-format json`.
  - `parseStreamLine(line: string) -> { delta?: string, result?: string, error?: string } | null` — `{type:'stream_event', event:{type:'content_block_delta', delta:{type:'text_delta', text}}}` → `{delta: text}`; `{type:'result', is_error:false, result}` → `{result}`; `{type:'result', is_error:true}` → `{error: result || subtype}`; anything else → `null`.
  - `runClaude({ prompt, model, effort, tools, system, cwd, bin = defaultBin(), timeoutMs = 900000 }) -> Promise<string>` — prompt written to stdin; resolves `result`; rejects `Error('claude: <message>')` on non-zero exit, `is_error`, or timeout (child killed).
  - `streamClaude({ …same, onDelta(text) }) -> Promise<string>` — same, streaming.
  - `defaultBin() -> string[]` — `[process.env.CLAUDE_BIN]` or `['claude']`. `bin` is a command plus leading args (tests pass `[process.execPath, 'tests/fixture/fake-claude.mjs']`).
- `tests/fixture/fake-claude.mjs`: appends its argv and stdin as one JSON line to `process.env.FAKE_CLAUDE_LOG` (when set); replies `process.env.FAKE_CLAUDE_REPLY` split in two deltas (stream mode) or as one `result` (json mode); `FAKE_CLAUDE_FAIL=1` → `is_error` result and exit 1.

- [ ] **Step 1: Write the failing tests**

```js
it('isolates every call and passes no tools by default', () => {
  const a = claudeArgs({ model: 'claude-sonnet-5-5', effort: 'low' })
  expect(a).toEqual(expect.arrayContaining(['-p', '--no-session-persistence', '--strict-mcp-config', '--effort', 'low']))
  expect(a[a.indexOf('--tools') + 1]).toBe('')
  expect(a[a.indexOf('--setting-sources') + 1]).toBe('')
})
it('reads text deltas and the result', () => {
  expect(parseStreamLine('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"ho"}}}')).toEqual({ delta: 'ho' })
  expect(parseStreamLine('{"type":"result","subtype":"success","is_error":false,"result":"hola"}')).toEqual({ result: 'hola' })
  expect(parseStreamLine('{"type":"system","subtype":"init"}')).toBeNull()
})
it('sends the prompt on stdin and resolves the reply', async () => {
  await expect(runClaude({ prompt: 'P', model: 'm', bin })).resolves.toBe('hola mundo')
  expect(lastLog().stdin).toBe('P')
})
it('streams deltas', async () => { const seen = []; await streamClaude({ prompt: 'P', model: 'm', bin, onDelta: (d) => seen.push(d) }); expect(seen.join('')).toBe('hola mundo') })
it('rejects when claude fails', () => expect(runClaude({ prompt: 'P', model: 'm', bin, env: { FAKE_CLAUDE_FAIL: '1' } })).rejects.toThrow(/^claude: /))
```
(`runClaude` and `streamClaude` accept an optional `env` merged over `process.env`, for tests.)

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/claude.test.js` → FAIL.

- [ ] **Step 3: Implement `scripts/lib/claude.mjs` and the fake.** `spawn(bin[0], [...bin.slice(1), ...args], { cwd, env, shell: false })`; split stdout on newlines.

- [ ] **Step 4: Run them to verify they pass** — same command → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/claude.mjs tests/fixture/fake-claude.mjs tests/claude.test.js
git commit -m "Reader: run claude -p in isolation, plain or streaming"
```

### Task 6: Translation — ProcTHOR in Spanish

**Files:**
- Create: `scripts/papers/numbers.mjs`, `scripts/papers/translate.mjs`
- Modify: `package.json` (`"paper:translate": "node scripts/papers/translate.mjs"`)
- Modify (output): `papers/procthor-2022/paper.json`, `papers/index.json`
- Test: `tests/papers/translate.test.js`

**Interfaces:**
- Consumes: `runClaude` (Task 5); `blocksOf`, `validatePaper` (Task 1); `indexPapers` (Task 1).
- Produces:
  - `numbersOf(text) -> string[]` (every digit run with its decimal part, thousands separators removed: `"17,000"` and `"17 000"` → `"17000"`, `"0.25"` → `"0.25"`, `"31.4%"` → `"31.4"`) and `sameNumbers(en, es) -> boolean` (same multiset).
  - `batches(paper, maxWords = 2500) -> Array<{ items: Array<{ id: string, text: string }> }>` — section titles as `"<sectionId>#title"`, then paragraph, heading, figure and table caption blocks; skips `refs` and `equation`; never splits a section unless it alone exceeds `maxWords`.
  - `translatePrompt(items) -> { system, prompt }` — the system prompt states the Global Constraints' translation rules and asks for one JSON object `{ "<id>": "<Spanish>" }` and nothing else.
  - `applyTranslation(paper, byId) -> paper`; `untranslated(paper) -> string[]`.
  - `translate(nodeId, { root, claude = runClaude }) -> Promise<{ translated: number, mismatched: string[] }>` — model `claude-sonnet-5-5`, effort `medium`, no tools; only blocks without `es`; a block whose numbers differ is retried once in a batch of its own and, if it still differs, left without `es` and listed in `mismatched`; writes `paper.json` and `papers/index.json` after every batch.

- [ ] **Step 1: Write the failing tests**

```js
it('compares numbers across languages', () => {
  expect(sameNumbers('17,000 plans, 0.25 m, 31.4%', '17 000 planos, 0.25 m, 31.4 %')).toBe(true)
  expect(sameNumbers('5 positions', '6 posiciones')).toBe(false)
})
it('batches by section and skips the references', () => expect(batches(paper, 2500).flatMap((b) => b.items.map((i) => i.id))).not.toContain('refs-p1'))
it('fills es and leaves a mismatched block untranslated', async () => {
  const claude = fakeTranslator({ 's2-p1': 'Cinco posiciones' /* en says 5 → mismatch twice */ })
  const r = await translate('sample-a', { root, claude })
  expect(r.mismatched).toEqual(['s2-p1'])
  expect(read().sections[1].blocks.find((b) => b.id === 's2-p2').text.es).toBeDefined()
})
it('ignores anything around the JSON object', …) // a reply wrapped in ```json … ``` still parses
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/papers/translate.test.js` → FAIL.

- [ ] **Step 3: Implement `numbers.mjs` and `translate.mjs`.**

- [ ] **Step 4: Run them to verify they pass** — same command → PASS.

- [ ] **Step 5: Translate ProcTHOR and review it**

Run: `npm run paper:translate -- procthor-2022`
Expected: `mismatched` empty or each listed block fixed by running again; read the Spanish of sections 1 and 3 against the English. `npm run check` → `map OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/papers/numbers.mjs scripts/papers/translate.mjs tests/papers/translate.test.js package.json papers/
git commit -m "Reader: translate a paper to Spanish, numbers checked; ProcTHOR in Spanish"
```

### Task 7: The idea graph — ProcTHOR's

**Files:**
- Create: `scripts/papers/graph.mjs`
- Modify: `package.json` (`"paper:graph": "node scripts/papers/graph.mjs"`)
- Create (output): `papers/procthor-2022/graph.json`; Modify: `papers/index.json`
- Test: `tests/papers/graph.test.js`

**Interfaces:**
- Consumes: `runClaude` (Task 5); `validateGraph`, `blocksOf`, `textOf` (Task 1).
- Produces:
  - `graphPrompt(paper, map) -> { system, prompt }` — the prompt holds every non-`refs` block as `[<id>] <English text>`, the current `question` and `hypothesis` texts, and the map's nodes as `<id> — <title>`; the system prompt describes the graph contract (Data contracts), asks for 15–40 ideas covering the paper's questions, methods, data, results (numbers exactly as stated), claims, limitations and future work, every idea citing ≥ 1 block, `thesis` links only where the paper genuinely bears on the thesis, both `en` and `es` statements, and one JSON object as the whole reply.
  - `extractJson(text) -> any` — the first top-level `{…}` (also inside a ```json fence); throws `Error('no JSON object in the reply')`.
  - `buildGraph(nodeId, { root, claude = runClaude, date }) -> Promise<{ ideas: number, edges: number, thesis: number }>` — model `claude-sonnet-5-5`, effort `xhigh`, no tools; sets `version`, `node`, `built`, every `origin: 'read'`; validates against `paper.json` and the map ids; on any problem throws `Error` listing them and **does not touch an existing `graph.json`**; otherwise writes it and `papers/index.json`.

- [ ] **Step 1: Write the failing tests**

```js
it('puts block ids, the thesis and the map nodes in the prompt', () => {
  const { prompt } = graphPrompt(paper, map)
  expect(prompt).toContain('[s2-p1] ')
  expect(prompt).toContain(map.centre.hypothesis.at(-1).text)
  expect(prompt).toContain('sample-b — ')
  expect(prompt).not.toContain('[refs-p1]')
})
it('writes a valid graph', async () => { await buildGraph('sample-a', { root, claude: reply(validGraph), date: '2026-10-22' }); expect(read().built).toEqual({ date: '2026-10-22', model: 'claude-sonnet-5-5', effort: 'xhigh' }) })
it('keeps the old graph when the reply is invalid', async () => {
  const before = readRaw()
  await expect(buildGraph('sample-a', { root, claude: reply(graphCiting('s9-p9')), date })).rejects.toThrow('block "s9-p9" is not in paper.json')
  expect(readRaw()).toBe(before)
})
it('keeps the old graph when claude fails', …)
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/papers/graph.test.js` → FAIL.

- [ ] **Step 3: Implement `scripts/papers/graph.mjs`.**

- [ ] **Step 4: Run them to verify they pass** — same command → PASS.

- [ ] **Step 5: Build ProcTHOR's graph and read it**

Run: `npm run paper:graph -- procthor-2022`
Expected: 15–40 ideas; spot-check five ideas against their cited blocks and every `thesis` link against the map. `npm run check` → `map OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/papers/graph.mjs tests/papers/graph.test.js package.json papers/
git commit -m "Reader: build a paper's idea graph once (Sonnet 5.5, xhigh); ProcTHOR's graph"
```

### Task 8: The reader in the map (read-only)

**Files:**
- Create: `assets/reader-ui.js`, `assets/reader.css`
- Modify: `assets/view.js` (load `papers/index.json`; toolbar **Papers**; **Read** in a paper's panel; mount the reader; insets; lit; Esc), `index.html` (link `assets/reader.css`)
- Test: `tests/reader-ui.test.js`

**Interfaces:**
- Consumes: `textOf`, `paraLabel`, `blocksOf` (Task 1); `papers/index.json` and `paper.json` (Tasks 4–6).
- Produces (`assets/reader-ui.js`):
  - `LABELS = { en: {…}, es: {…} }` — every reader string (bar buttons, menu items, chat strings added in later tasks).
  - `mountReader(root, { papers, map, load, client = null, onLit, onShow, win = window }) -> { open(nodeId, at?: { block }), close(), isOpen(): boolean, mode(): 'half'|'full', setMode(m), lang(): 'en'|'es', setLang(l), insets(): { right: number }, current(): { paper, nodeId } | null }`
  - DOM: `<section class="reader" data-mode="half|full" hidden>` containing `.reader__bar` (title, `button.reader__lang` EN/ES, `button.reader__mode` ⤢/⤡, `button.reader__close`), `.reader__side` (contents, figure thumbnails; shown in full mode), `.reader__text` (one element per block with `data-block`: `h3` headings, `p.blk` paragraphs, `figure.blk` with `img` + `figcaption`, `pre.blk` equations), `.reader__chat` (empty until Task 16).
  - `mode` and `lang` remembered in `localStorage` (`research-map-reader-mode`, `research-map-reader-lang`), defaults `half` and `es`; on viewports narrower than 700px `mode()` is always `full`.
- Consumes in `view.js`: `start` reads `papers/index.json` through `read()` (so `?dir=tests/fixture/` works) and passes `papers` to `createView(root, map, notes, { index, papers })`.

- [ ] **Step 1: Write the failing tests**

`tests/reader-ui.test.js`, with `start(root, { load: fromDisk, dir: 'tests/fixture/', index })` (Task 1's fixture paper has Spanish for `s2-p1` only):
```js
it('shows Read in a prepared paper panel and Papers in the toolbar', () => {
  view.select('sample-a'); expect($('.panel [data-read="sample-a"]')).not.toBeNull()
  view.select('sample-b'); expect($('.panel [data-read]')).toBeNull()
  expect($('.toolbar .papers')).not.toBeNull()
})
it('opens in half mode, in Spanish, falling back to English', async () => {
  await read('sample-a')
  expect($('.reader').dataset.mode).toBe('half')
  expect(block('s2-p1').textContent).toBe(es_s2p1)
  expect(block('s2-p2').textContent).toBe(en_s2p2)
})
it('switches to English and back', …)
it('switches half ↔ full and remembers it', …)  // localStorage 'research-map-reader-mode' === 'full'
it('places the figure with its caption', () => expect($('figure[data-block="fig-1"] img').getAttribute('src')).toBe('tests/fixture/papers/sample-a/fig/fig-1.png'))
it('shows only the caption when a figure image fails to load', …) // dispatch 'error' on the img → figure gets class 'missing', no img shown
it('lights the paper and the nodes it links to, and closes the panel and the viewer', async () => {
  ui.open({ track: 'leaders', presentation: 'presentacion-01', n: 2 }); await read('sample-a')
  expect($('.viewer').hidden).toBe(true); expect($('.panel').hidden).toBe(true)
  expect(card('sample-a').classList.contains('lit')).toBe(true)
})
it('Esc closes the reader and clears the light', …)
it('hides underlining, chat and quizzes without a client', …) // mountReader(…, { client: null }): no .reader__chat content, selection menu offers only "Read from here"
it('opens a figure enlarged on click and closes it with Esc', …) // click figure img → dialog.reader__zoom open with the same src
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/reader-ui.test.js` → FAIL.

- [ ] **Step 3: Implement `assets/reader-ui.js`, `assets/reader.css`, the `view.js` wiring**

A click on a figure opens it enlarged in a `<dialog class="reader__zoom">`. Half mode: `position:absolute; top` below the toolbar, `right:0; bottom:0; width:50%`, the text above and `.reader__chat` below it with a collapse toggle (`.reader__chat-toggle`), `fit()` takes `reader.insets().right` like the node panel; full mode: covers the stage, three columns (`220px | 1fr | 360px`) as in the mockup. Text in `var(--font-serif)`, 17px, max 70ch. Opening the reader calls `onShow()` (view closes the panel with `select(null)` and the presentations viewer with `ui?.close()`), then `onLit([nodeId, ...linked])`; closing calls `onLit(null)`. Esc order in `view.js`: presentations menu, then reader, then panel.

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test` — Expected: all tests pass, including the existing 134.

- [ ] **Step 5: Look at it**

Run: `npm run dev` (still `http-server` here) and open `http://localhost:4322/` in Edge; open ProcTHOR from **Papers**, switch EN/ES and half/full, compare with the mockup, in light and dark.

- [ ] **Step 6: Commit**

```bash
git add assets/reader-ui.js assets/reader.css assets/view.js index.html tests/reader-ui.test.js
git commit -m "Reader: papers open in the map, half or full, English or Spanish, with their figures"
```

### Task 9: The other nine papers

**Files:**
- Create (output): `papers/<id>/…` for `msd`, `resplan-2026`, `floorplancad-2021`, `pinki-2024`, `cubicasa5k-2019`, `park-2024`, `edgegan-2021`, `madireddy-2025`, `comcheck-2025`; `papers/index.json`

**Interfaces:**
- Consumes: `npm run paper:prepare|paper:translate|paper:graph -- <id>` (Tasks 4, 6, 7).

- [ ] **Step 1: For each paper, prepare and review**

Run: `npm run paper:prepare -- <id>`, then read every crop and a few paragraphs as in Task 4 Step 5; fix with `overrides.json`.

- [ ] **Step 2: Translate and review** — `npm run paper:translate -- <id>`; `mismatched` empty.

- [ ] **Step 3: Build the graph and spot-check** — `npm run paper:graph -- <id>`.

- [ ] **Step 4: Check and commit, one commit per paper**

Run: `npm run check && npm test` → `map OK`, all pass.
```bash
git add papers/<id> papers/index.json
git commit -m "Reader: <Paper> prepared — text, figures, Spanish, graph"
```

### Task 10: Voice

**Files:**
- Create: `assets/speech.js`
- Modify: `assets/reader-ui.js` (voice controls, read-from-here, sentence light, remembered position in memory), `assets/reader.css`
- Test: `tests/speech.test.js`, `tests/reader-ui.test.js` (voice cases)

**Interfaces:**
- Consumes: `sentences`, `textOf`, `blocksOf` (Task 1).
- Produces (`assets/speech.js`):
  - `buildQueue(paper, lang, from: { block, offset? } | null, only?: { block, start, end }) -> Array<{ block, start, end, text }>` — one item per sentence; figures and tables read their caption; skips `refs` and `equation`; `from` starts at the sentence containing `offset`; `only` limits to a selection.
  - `createSpeaker({ synth, Utterance, onSentence(item | null), onIdle() }) -> { play(queue), pause(), resume(), stop(), setRate(r), setVoice(name), voicesFor(lang) -> SpeechSynthesisVoice[], state() -> 'idle'|'playing'|'paused', at() -> item | null }` — one utterance per item, the next spoken from the previous `onend`; `stop()` cancels and calls `onSentence(null)`.
- Reader controls (in `.reader__bar`): `▶` read all, `⏸`/`▶` pause/resume, `■` stop, `⏮`/`⏭` previous/next paragraph, a rate select `0.75 1 1.25 1.5 2`, a voice select (`voicesFor(lang)`); the selection menu's **▶ Read from here** and a **▶ Read selection** item; the spoken sentence gets class `speaking` and is scrolled into view. When `voicesFor(lang)` has no name containing `Natural`, a one-time hint says Edge has natural voices (`localStorage` `research-map-reader-voice-hint`).

- [ ] **Step 1: Write the failing tests**

`tests/speech.test.js` with a fake `synth` (`speak`, `cancel`, `pause`, `resume`, `getVoices`) whose utterances end when the test calls `finish()`:
```js
it('queues sentences from a point, captions included, references skipped', () => {
  const q = buildQueue(paper, 'en', { block: 's2-p1', offset: 0 })
  expect(q[0].block).toBe('s2-p1'); expect(q.some((i) => i.block === 'fig-1')).toBe(true); expect(q.some((i) => i.block.startsWith('refs'))).toBe(false)
})
it('reads only a selection', …)
it('speaks one sentence after another and reports each', …)
it('pauses, resumes and stops', …) // stop → synth.cancel called, onSentence(null)
it('filters voices by language', …)
```
`tests/reader-ui.test.js` (speaker injected through `mountReader(…, { speech: fakeSynth })`):
```js
it('lights the sentence being read', …)
it('switching language while reading resumes the same block in the other language', () => {
  play(); setLang('en')
  expect(fakeSynth.cancel).toHaveBeenCalled()
  expect(lastSpoken().text).toBe(firstSentenceOf(en_s2p1))
})
it('closing the reader stops the voice', …)
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/speech.test.js tests/reader-ui.test.js` → FAIL.

- [ ] **Step 3: Implement `assets/speech.js` and the controls.** `mountReader` takes `speech = { synth: win.speechSynthesis, Utterance: win.SpeechSynthesisUtterance }`; without `speechSynthesis` the voice controls are hidden.

- [ ] **Step 4: Run them to verify they pass** — `npm test` → PASS.

- [ ] **Step 5: Listen to it** — in Edge, read ProcTHOR §3 in Spanish with a natural voice: pause, resume, read from a clicked paragraph, change speed.

- [ ] **Step 6: Commit**

```bash
git add assets/speech.js assets/reader-ui.js assets/reader.css tests/speech.test.js tests/reader-ui.test.js
git commit -m "Reader: read aloud — all, from here or a selection, sentence by sentence"
```

### Task 11: The local server (replaces `http-server`)

**Files:**
- Create: `scripts/serve.mjs`, `scripts/server/static.mjs`, `scripts/server/guard.mjs`, `scripts/server/api.mjs` (health only here)
- Modify: `package.json` (`"dev": "node scripts/serve.mjs"`, remove `http-server` from devDependencies), `package-lock.json` (`npm install`)
- Test: `tests/server/serve.test.js`

**Interfaces:**
- Produces:
  - `createServer({ root, claude = { run: runClaude, stream: streamClaude }, now = () => new Date() }) -> http.Server` (tests `listen(0)`); CLI: `node scripts/serve.mjs [--phone]` listens on `127.0.0.1` and `process.env.PORT ?? 4322` and prints `http://localhost:4322/`.
  - `serveStatic(root, pathname, res) -> Promise<void>` — decodes the path; anything resolving outside `root`, or with a segment starting with `.` (`.git`, `.superpowers`), or under `node_modules` → 404; a directory serves its `index.html`; `Content-Type` from a fixed map (`html js mjs css json md png jpg jpeg svg pdf mp4 woff2 txt`), `Cache-Control: no-cache`.
  - `allowed(req, { port }) -> boolean` — `Host` must be `localhost:<port>`, `127.0.0.1:<port>`, or end in `.ts.net`; for `POST`/`PUT`, `Content-Type` must start with `application/json` and an `Origin` header, when present, must equal `http(s)://<Host>`. Refused → 403 `{"error":"forbidden"}`.
  - `handleApi(req, res, ctx) -> Promise<boolean>` — `GET /api/health` → `200 {"ok":true}`; unknown `/api/*` → 404 JSON; returns `false` for non-API paths. Bodies over 1 MB → 413; invalid JSON → 400.

- [ ] **Step 1: Write the failing tests**

```js
it('serves the map like before, without caching', async () => {
  const r = await get('/index.html'); expect(r.status).toBe(200)
  expect(r.headers.get('content-type')).toMatch(/^text\/html/); expect(r.headers.get('cache-control')).toBe('no-cache')
})
it('serves a PDF whose name has spaces', …) // '/files/ProcTHOR%20-%20….pdf' → 200 application/pdf
it('never serves outside the folder or dot folders', async () => {
  expect((await get('/..%2fpackage.json')).status).toBe(404); expect((await get('/.git/config')).status).toBe(404)
})
it('answers health', …)
it('refuses another site posting to the API', async () => {
  expect((await post('/api/health', {}, { Origin: 'https://evil.example' })).status).toBe(403)
  expect((await post('/api/health', {}, { 'Content-Type': 'text/plain' })).status).toBe(403)
  expect((await get('/api/health', { Host: 'rebound.example:4322' })).status).toBe(403)
})
it('accepts the tailnet host', …) // Host: 'laptop.tail1234.ts.net' → 200
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/server/serve.test.js` → FAIL.

- [ ] **Step 3: Implement the server files; update `package.json`; run `npm install`.**

- [ ] **Step 4: Run them to verify they pass** — `npm test` → PASS.

- [ ] **Step 5: Check the map still opens** — `npm run dev`, open `http://localhost:4322/`: map, presentations (a deck in the viewer and standalone), the reader.

- [ ] **Step 6: Commit**

```bash
git add scripts/serve.mjs scripts/server tests/server package.json package-lock.json
git commit -m "Server: the map's own local server, guarded, in place of http-server"
```

### Task 12: Underlines and the remembered position

**Files:**
- Create: `assets/reading.js`, `assets/reading-client.js`
- Modify: `scripts/server/api.mjs` (state routes), `assets/reader-ui.js` (selection menu **Underline**, marks, margin marks, position), `assets/view.js` (create the client, pass it to the reader), `assets/reader.css`
- Test: `tests/reading.test.js`, `tests/server/state.test.js`, `tests/reader-ui.test.js` (underline cases)

**Interfaces:**
- Consumes: `handleApi` (Task 11); `validatePaper` (Task 1).
- Produces:
  - `assets/reading.js` (pure): `emptyReading() -> Reading` (Data contracts, `lang: 'es'`), `validateReading(r) -> string[]`, `addUnderline(r, { block, lang, start, end, text }, date) -> Reading` (id `u<n>`), `removeUnderline(r, id) -> Reading`, `segments(text, ranges: Array<{ start, end, id }>) -> Array<{ text: string, ids: string[] }>`.
  - `assets/reading-client.js`: `createClient({ fetch = window.fetch, wait = 800 }) -> { available(): Promise<boolean>, load(id): Promise<Reading>, save(id, reading): void /* debounced, last write wins */, flush(): Promise<void>, chat(body, onEvent): Promise<void>, draftNote(body): Promise<string>, saveNote(body): Promise<void> }` (`chat`, `draftNote`, `saveNote` used from Task 16) and `parseSSE(buffer) -> { events: Array<{ event: string, data: any }>, rest: string }`.
  - API: `GET /api/state/:id` → the stored reading or `emptyReading()`; `PUT /api/state/:id` → validates and writes `reading/<id>.json` (temp file then rename); `:id` must be a prepared paper or `_across`, else 404; invalid → 400 with the problems.
  - Reader: `offsetsIn(blockEl, range) -> { start, end } | null` (exported for tests); underlined runs rendered as `<mark data-u="u1">`; in the other language an underlined block gets class `has-underline` (margin mark); clicking a mark offers **Remove underline**; position saved on scroll (the first visible block) and on every spoken sentence; reopening a paper scrolls to it. The reading's `lang`, `voice` and `rate` are saved on change and, when present, win over the `localStorage` defaults on open. When `client.available()` resolves false, the reader behaves as with no client (Task 8).

- [ ] **Step 1: Write the failing tests**

```js
// reading.test.js
it('cuts text into runs around overlapping underlines', () =>
  expect(segments('abcdefgh', [{ start: 2, end: 5, id: 'u1' }, { start: 4, end: 7, id: 'u2' }])).toEqual([
    { text: 'ab', ids: [] }, { text: 'cd', ids: ['u1'] }, { text: 'e', ids: ['u1', 'u2'] }, { text: 'fg', ids: ['u2'] }, { text: 'h', ids: [] }]))
it('adds and removes underlines', …)
it('names an underline with start after end', …)
it('reads server-sent events across chunk boundaries', () => {
  const a = parseSSE('event: delta\ndata: {"text":"ho"}\n\nevent: del'); expect(a.events).toEqual([{ event: 'delta', data: { text: 'ho' } }])
  expect(parseSSE(a.rest + 'ta\ndata: {"text":"la"}\n\n').events[0].data.text).toBe('la')
})
// server/state.test.js
it('returns an empty reading, then what was saved', …)
it('refuses an unknown paper and an invalid reading', …) // 404, 400
// reader-ui.test.js
it('underlines a selection and saves it', …)       // select text in s2-p1 → menu Underline → <mark> appears, client.save called with block 's2-p1', lang 'es'
it('shows a margin mark in the other language', …)  // setLang('en') → block s2-p1 has class has-underline, no <mark>
it('reopens at the remembered block, language and voice', …)
it('offers no Underline when the server does not answer', …) // client.available() → false
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/reading.test.js tests/server/state.test.js tests/reader-ui.test.js` → FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run them to verify they pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/reading.js assets/reading-client.js scripts/server/api.mjs assets/reader-ui.js assets/view.js assets/reader.css tests
git commit -m "Reader: underlines and the place you left, kept in reading/"
```

### Task 13: The phone

**Files:**
- Modify: `scripts/serve.mjs` (`--phone`), `package.json` (`"dev:phone": "node scripts/serve.mjs --phone"`), `assets/reader.css` (phone layout), `README.md` (Open it: `npm run dev`, `npm run dev:phone`)
- Test: `tests/server/phone.test.js`

**Interfaces:**
- Produces: `phoneCommand(port) -> { cmd: 'tailscale', args: ['serve', String(port)] }`; `startPhone({ port, spawn }) -> ChildProcess` — runs it in the foreground, prints the `https://<machine>.<tailnet>.ts.net/` address read from `tailscale status --json` (`Self.DNSName` without the trailing dot), and is killed when the server exits (`SIGINT`, `SIGTERM`, `exit`). Nothing is installed or left running.
- Phone layout (`@media (max-width: 700px)`): the reader is full, one column; the side column becomes a contents button; the chat is a sheet from the bottom behind a **Chat** button.

- [ ] **Step 1: Write the failing test**

```js
it('serves the port on the tailnet in the foreground', () => expect(phoneCommand(4322)).toEqual({ cmd: 'tailscale', args: ['serve', '4322'] }))
it('stops tailscale serve when the server stops', …) // injected spawn returns a fake child; emitting process 'exit' calls child.kill()
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run tests/server/phone.test.js` → FAIL.

- [ ] **Step 3: Implement; write the phone CSS; update the README.**

- [ ] **Step 4: Run it to verify it passes** — `npm test` → PASS.

- [ ] **Step 5: Try it on the phone** — `npm run dev:phone`, open the printed address on the phone (Tailscale on): open a paper, listen, underline; stop the server with Ctrl+C and confirm `tailscale serve status` shows nothing.

- [ ] **Step 6: Commit**

```bash
git add scripts/serve.mjs package.json assets/reader.css README.md tests/server/phone.test.js
git commit -m "Server: npm run dev:phone opens the reader to the phone through Tailscale while it runs"
```

### Task 14: The companion's prompts and protocol

**Files:**
- Create: `scripts/server/prompts.mjs`
- Test: `tests/server/prompts.test.js`

**Interfaces:**
- Consumes: `blocksOf`, `textOf`, `paraLabel` (Task 1).
- Produces:
  - `MODELS = { sonnet: { model: 'claude-sonnet-5-5', effort: 'low' }, haiku: { model: 'claude-haiku-5-5' }, reread: { model: 'claude-sonnet-5-5', effort: 'medium' } }`
  - `RESEARCH_TOOLS = ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch']`
  - `chatPrompt({ mode, papers: Array<{ node, title, graph }>, thesis: { question, hypothesis }, mapTitles: Record<id, title>, underlines, attach, history, message, scope, lang }) -> { system, prompt }` — `mode` ∈ `ask | explain | research | quiz`. The system prompt sets the tutor stance (explain, then make the author think; no summaries unless asked), answers in `lang`, cites as `[¶ <block-id>]`, and for every mode but `research` requires the **first line** to be `COVERED` or `NOT COVERED: <block ids near the question>`; `quiz` asks for open questions on `scope` (`{ kind: 'underline'|'section'|'paper'|'papers', ids }`) that make the author explain, compare or argue against the hypothesis, without answers; when the last assistant message in `history` was a quiz, the system prompt tells Claude to assess the author's answer against the graph — what was right, what was missing — citing paragraphs; `research` lists the other prepared papers' graph paths and `notes/` for `Read`, and asks for sources at the end.
  - `rereadPrompt({ paper, blockIds: string[] | null, question, history, lang }) -> { system, prompt }` — the given blocks (or all non-`refs` blocks when `null`) as `[<id>] <text>`; asks for the answer, then, if it found ideas the graph lacked, a final fenced block ```` ```graph-add ```` holding a JSON array of ideas (Data contracts, without `id`/`origin`); first line `NOT COVERED` when even the text does not answer.
  - `notePrompt({ text, from: 'author'|'claude', node, paperTitle }) -> { system, prompt }` — asks for the body of one note entry in English, quoting the author's words exactly as written, marking `Author:` and `Claude:` parts, no heading line.
  - `parseStatus(firstLine) -> { covered: boolean, near: string[] } | null` (null when the line is neither form).
  - `splitGraphAdd(text) -> { answer: string, ideas: object[] }`.
  - `citesOf(text) -> string[]` (block ids in `[¶ …]`, unique, in order).
  - `nearBlocks(paper, ids, radius = 3) -> string[]` (each id with `radius` blocks on each side, document order, no `refs`).

- [ ] **Step 1: Write the failing tests**

```js
it('asks for the status line and puts the graph, not the text, in a question', () => {
  const { system, prompt } = chatPrompt({ mode: 'ask', papers: [{ node: 'sample-a', title: 'Sample', graph }], …base })
  expect(system).toMatch(/first line/i); expect(prompt).toContain(graph.ideas[0].en); expect(prompt).not.toContain(paperText)
})
it('includes the attached passage word for word', …)
it('quiz asks for questions on the chosen scope, without answers', …)
it('after a quiz, the next turn asks Claude to assess the answer', …) // history ends with an assistant message of mode 'quiz' → system mentions what was right and what was missing
it('research lists the other graphs and the notes', …)
it('parses both status lines', () => {
  expect(parseStatus('COVERED')).toEqual({ covered: true, near: [] })
  expect(parseStatus('NOT COVERED: s3-p2 s4-p1')).toEqual({ covered: false, near: ['s3-p2', 's4-p1'] })
  expect(parseStatus('Hola')).toBeNull()
})
it('splits the graph-add block off the answer', …)
it('finds cited blocks', () => expect(citesOf('a [¶ s3-p2] b [¶ fig-1] [¶ s3-p2]')).toEqual(['s3-p2', 'fig-1']))
it('takes the blocks around the near ones', …)
it('the note prompt keeps the author words verbatim', …) // prompt contains the exact Spanish text, system mentions English and Author:/Claude:
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/server/prompts.test.js` → FAIL.

- [ ] **Step 3: Implement `scripts/server/prompts.mjs`.**

- [ ] **Step 4: Run them to verify they pass** — same command → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/server/prompts.mjs tests/server/prompts.test.js
git commit -m "Reader: the companion's prompts — graph first, re-read, quiz, research, note"
```

### Task 15: Chat and note endpoints

**Files:**
- Create: `scripts/server/chat.mjs`
- Modify: `scripts/server/api.mjs` (`POST /api/chat`, `POST /api/note-draft`, `POST /api/note`)
- Test: `tests/server/chat.test.js`

**Interfaces:**
- Consumes: `streamClaude`, `runClaude` (Task 5); prompts (Task 14); `validateGraph`, `mergeIdeas` (Task 1); `validateReading` (Task 12).
- Produces:
  - `POST /api/chat` body `{ conv: '<node-id>' | '_across', chatId?: string, papers: string[], mode, scope?, attach: [{ block, text }], message, lang, model: 'sonnet'|'haiku' }` → `text/event-stream` events: `delta {text}`, `status {phase: 'reread'}`, `done {chatId, text, cites, graphAdded}`, `error {message}`.
  - `chat(body, { root, claude: { stream, run }, send(event, data), now }) -> Promise<void>`:
    1. Load each paper's `paper.json` and `graph.json`, the map, and `reading/<conv>.json`; create the chat when `chatId` is missing.
    2. `research` mode: `streamClaude` with `RESEARCH_TOOLS`, cwd `root`, `MODELS[model]`; stream everything.
    3. Other modes: stream with `MODELS[model]`, no tools; hold text until the first newline, `parseStatus` it (a null status counts as covered and the line is kept); when covered, stream the rest.
    4. Not covered (single-paper conversations): `send('status', { phase: 'reread' })`, then `rereadPrompt` over `nearBlocks(paper, near)` (or `null` when `near` is empty) with `MODELS.reread`; if that answer is again `NOT COVERED` and blocks were given, once more with `null`. Stream the answer without the `graph-add` block; `mergeIdeas` the ideas that pass `validateGraph` and write `graph.json`.
    5. Append the user message and, only on success, the assistant message to the chat; write the reading file; `send('done', …)`. On any failure: `send('error', { message })`, keep the user message, write nothing else.
  - `POST /api/note-draft` `{ node, text, from }` → `{ draft }` (`runClaude`, `MODELS.sonnet`, `notePrompt`).
  - `POST /api/note` `{ nodes: string[], body }` → appends `\n## <YYYY-MM-DD> · Reading\n<body>\n` to each `notes/<node>.md` (each must be a paper node; body non-empty, no line starting with `## `) → `{ ok: true }`.

- [ ] **Step 1: Write the failing tests** (fake claude from Task 5 driven per call; temp copy of the fixture)

```js
it('answers from the graph and saves both messages', async () => {
  const ev = await chatEvents({ mode: 'ask', message: '¿Qué valida?' }, reply('COVERED\nRevisa cada casa [¶ s2-p1].'))
  expect(ev.at(-1)).toMatchObject({ event: 'done', data: { text: 'Revisa cada casa [¶ s2-p1].', cites: ['s2-p1'] } })
  expect(saved().chats[0].messages.map((m) => m.role)).toEqual(['user', 'assistant'])
  expect(lastArgs()).toEqual(expect.arrayContaining(['--model', 'claude-sonnet-5-5', '--effort', 'low']))
})
it('goes back to the text when the graph does not cover it, and grows the graph', async () => {
  const ev = await chatEvents({ mode: 'ask', message: 'x' }, replies('NOT COVERED: s2-p1', 'COVERED\nSí [¶ s2-p2].\n```graph-add\n[{"kind":"claim","en":"e","es":"e","blocks":["s2-p2"]}]\n```'))
  expect(ev.map((e) => e.event)).toContain('status')
  expect(ev.at(-1).data.text).toBe('Sí [¶ s2-p2].')
  expect(graph().ideas.at(-1)).toMatchObject({ origin: 'question', blocks: ['s2-p2'] })
  expect(argsOf(1)).toEqual(expect.arrayContaining(['--effort', 'medium']))
})
it('uses Haiku without an effort flag when asked', …)
it('research mode gets the read and web tools, never shell or edits', () => …) // '--tools' value 'Read,Grep,Glob,WebSearch,WebFetch'
it('reports a claude failure and stores no assistant message', …)
it('appends an approved note entry', async () => {
  await post('/api/note', { nodes: ['sample-a'], body: 'Author: "lo entendí así"\nClaude: …' })
  expect(note('sample-a')).toMatch(/\n## \d{4}-\d{2}-\d{2} · Reading\nAuthor: "lo entendí así"/)
})
it('refuses a note for a non-paper node or with a heading line', …)
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/server/chat.test.js` → FAIL.

- [ ] **Step 3: Implement `scripts/server/chat.mjs` and the routes.**

- [ ] **Step 4: Run them to verify they pass** — `npm test` → PASS.

- [ ] **Step 5: One real question** — `npm run dev`; `curl -N -H "Content-Type: application/json" -d "{\"conv\":\"procthor-2022\",\"papers\":[\"procthor-2022\"],\"mode\":\"ask\",\"attach\":[],\"message\":\"¿Para qué sirve el validador?\",\"lang\":\"es\",\"model\":\"sonnet\"}" http://localhost:4322/api/chat` — Expected: deltas, then `done` citing blocks; `git checkout reading/` afterwards if the transcript is not wanted.

- [ ] **Step 6: Commit**

```bash
git add scripts/server/chat.mjs scripts/server/api.mjs tests/server/chat.test.js
git commit -m "Server: the chat (graph first, text when needed) and approved note entries"
```

### Task 16: The chat in the reader

**Files:**
- Create: `assets/chat-ui.js`
- Modify: `assets/reader-ui.js` (selection menu **Ask**; mount the chat in `.reader__chat`; ¶ links scroll to blocks), `assets/reader.css`, `README.md` (the reader, `papers/`, `reading/`, the three `paper:*` scripts)
- Test: `tests/chat-ui.test.js`

**Interfaces:**
- Consumes: `createClient().chat/draftNote/saveNote` (Task 12); `paraLabel` (Task 1); `LABELS` (Task 8).
- Produces: `mountChat(el, { client, papers /* index entries */, labels, lang, onCite(blockId), current() /* { nodeId, paper } */ }) -> { attach({ block, text }), setLang(l), setConversation(nodeId | '_across') }`
  - Header: **This paper | Across papers** (across shows a checkbox per prepared paper; default all), model switch **Sonnet · Haiku** (default Sonnet).
  - Attached passages as chips (`«…»` + `¶ 3.2`, removable). Shortcuts: **What did they mean here?** (`explain`, needs a chip), **Research this** (`research`), **Quiz me ▾** (`quiz`, scope menu: this underline / this section / this paper / several papers).
  - Messages stream in; `[¶ s3-p2]` renders as a button labelled `¶ 3.2` that calls `onCite`; a `status reread` event shows "Reading the paper again…" (localized) until `done`; `error` shows the message with a retry button.
  - Every message has **Save this** → `draftNote` → an editable textarea with **Approve** / **Discard**; across papers adds checkboxes for the target notes; Approve → `saveNote({ nodes, body })` and a short confirmation. The transcript loads from the reading state when the reader opens.

- [ ] **Step 1: Write the failing tests** (fake client recording calls and replaying events)

```js
it('Ask attaches the selection as a chip', …)
it('What did they mean here sends explain with the chip', () => { click('explain'); expect(client.chat.mock.calls[0][0]).toMatchObject({ mode: 'explain', attach: [{ block: 's2-p1' }] }) })
it('streams the answer and turns citations into links that scroll', () => {
  emit('delta', { text: 'Ver ' }); emit('delta', { text: '[¶ s2-p2]' }); emit('done', { text: 'Ver [¶ s2-p2]', cites: ['s2-p2'] })
  click('button[data-cite="s2-p2"]'); expect(onCite).toHaveBeenCalledWith('s2-p2')
  expect($('button[data-cite="s2-p2"]').textContent).toBe('¶ 2.2')
})
it('quizzes only when asked, on the chosen scope', …) // nothing is sent on open; Quiz me → this section → mode 'quiz', scope { kind: 'section', ids: ['s2'] }
it('across papers sends the ticked papers to _across', …)
it('Haiku is sent when chosen', …)
it('Save this drafts, lets the author edit, and saves only on Approve', async () => {
  client.draftNote.mockResolvedValue('Author: "x"'); await click('[data-save]')
  type('textarea', 'Author: "x"\nClaude: y'); expect(client.saveNote).not.toHaveBeenCalled()
  await click('[data-approve]'); expect(client.saveNote).toHaveBeenCalledWith({ nodes: ['sample-a'], body: 'Author: "x"\nClaude: y' })
})
it('shows an error and offers retry', …)
```

- [ ] **Step 2: Run them to verify they fail** — `npx vitest run tests/chat-ui.test.js` → FAIL.

- [ ] **Step 3: Implement `assets/chat-ui.js` and the reader wiring; update the README.**

- [ ] **Step 4: Run them to verify they pass** — `npm test && npm run check` → PASS, `map OK`.

- [ ] **Step 5: Use it** — `npm run dev`, in Edge: underline a ProcTHOR paragraph → Ask → What did they mean here?; a question the graph cannot answer (watch the re-read status); Quiz me on a section and answer one question; Save this → edit → Approve and see the entry in the node's panel; Research this on one underline; Across papers with ProcTHOR and MSD.

- [ ] **Step 6: Commit**

```bash
git add assets/chat-ui.js assets/reader-ui.js assets/reader.css README.md tests/chat-ui.test.js
git commit -m "Reader: the study companion — ask, explain, research, quiz on demand, save to the note"
```
