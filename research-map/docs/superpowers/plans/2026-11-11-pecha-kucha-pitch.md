# Pecha Kucha Pitch (deck 06) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 15-slide, 5-minute, English-only Pecha Kucha pitch (`presentacion-06`) that advances by itself every 20 s, with a chapter bar at the foot and one building that is taken apart, masked and rebuilt across the slides.

**Architecture:** The shared deck engine (`deck.js`) gains an English-only mark and returns a small API plus a `deck:slide` event. A new `pitch.js` (opt-in by `<body data-pitch>`) holds the 20 s timer, the keys and the chapter bar. A new `pitch-building.js` draws one persistent point-cloud canvas behind the slides, driven by each slide's `data-phase` / `data-place`. Slide motion is CSS animation keyed to the 20 s, not click builds. Decks 01–05 carry none of the marks, so they behave as before.

**Tech Stack:** Vanilla ES modules, Canvas 2D, CSS (`deck.css` tokens), vitest + jsdom, the decks' checker (`scripts/check-presentations.mjs`). No new dependencies.

**Spec:** `research-map/docs/superpowers/specs/2026-11-11-pecha-kucha-pitch-design.md` (read it first; slide ideas and sources live there).

All paths are relative to `research-map/` unless they start with `pipeline/`. Run commands from `research-map/`.

## Global Constraints

- English only; the Spanish pair rule stays in force for every deck without `data-lang-only="en"`.
- 15 slides, 20 s each (`SLIDE_MS = 20000`), 5:00 total. Chapters, in order and by slide count: Topic & context 3 · Innovation 3 · Actors 1 · Exploit 3 · Impact 3 · Readiness & next 2.
- Every figure comes from a paper read or `pipeline/out/`. No invented impact numbers. The 10 models are a **plan**, never "in hand". The building is **Autodesk's sample project**; anything not built (step-03 classes, a mask's prediction, MCP placement) is labelled "illustrative".
- `data-map` ids must exist in `map.json`. External links only inside `.refs` with `target="_blank" rel="noopener"`. Links relative. Colours as tokens, light and dark. Fonts from Google Fonts only.
- On-screen text: aim for 25 words per slide, hard cap 40 (excluding `.refs`, `.pitch__tag`, the bar).
- Honour `prefers-reduced-motion`: the pitch still advances; motion becomes final states.
- Layout is verified by measuring in the browser, never by screenshots (they time out here). Turn view transitions off before measuring.
- Branch `feat/pitch-06`; never commit to `master`; never stage the author's files (`reading/`, `papers/renner-2025/`, `debug.log`, `notes/`, `map.json`). Stage by explicit path. Commit messages in English, ending with the line `Claude-Session: https://claude.ai/code/session_01MVp8qSGLqRC4Ho4dxDA998`. Do not push.
- `npm run check` and `npx vitest run` pass before every commit.

## Review Focus

Each line is pinned by a test in the task named in brackets.

1. First → or Space on the ready screen **starts** the pitch; it does not skip slide 1 [T3].
2. Pausing does not leak time: 10 s paused, then resumed, still gives 20 s on the slide [T3].
3. After a long stall (laptop sleep, throttled tab) one tick advances at most one slide [T3].
4. The last slide ends in `done` after 20 s; → past the end and ← before the start do nothing harmful [T3].
5. `?embed`, and decks 04/05, never show the bar, never auto-advance, never change their language handling; a stored `es` is neither shown nor overwritten on the English-only deck [T1, T3].
6. No slide carries a figure outside the spec's list, claims the 10 models exist, or shows a masked/rebuilt phase without the "illustrative" tag [T9–T12 via the deck test in T4].

---

### Task 1: Branch, baseline, and the English-only mark

**Files:**
- Modify: `scripts/check-presentations.mjs` (`checkLanguages`), `presentations/assets/deck.js` (`mountDeck`)
- Test: `tests/presentations/check.test.js`, `tests/presentations/deck.test.js`

**Interfaces:**
- Produces: `<body data-lang-only="en">` — checker skips the sibling rule for that page (empty `lang` text still an error; any `lang="es"` element is an error); `mountDeck` forces `en`, does not write storage, hides the `ES` button.

- [ ] **Step 1:** `git switch -c feat/pitch-06`. Run `npm run check` and `npx vitest run`; both must pass (baseline). `git add docs/superpowers/specs/2026-11-11-pecha-kucha-pitch-design.md docs/superpowers/plans/2026-11-11-pecha-kucha-pitch.md` and commit "Docs: design and plan for the Pecha Kucha pitch".
- [ ] **Step 2: Failing tests.** In `check.test.js` (use its `page`/`site` helpers; add a `langOnly` option that puts `data-lang-only="en"` on `<body>`): `passes an English-only page with the mark and no Spanish` (a slide `<h1><span lang="en">Only English</span></h1>` → `[]`); `fails an English-only page that still has Spanish text` (adds a `lang="es"` span → one error matching `/English-only/`); `still fails an empty English text on an English-only page`. In `deck.test.js`: `an English-only deck shows English, hides the language button and leaves the stored choice alone` (set `localStorage` `research-map-lang` to `es`, body `data-lang-only="en"`, mount; expect `document.documentElement.dataset.lang === 'en'`, `.deck__lang` hidden, storage still `es`).
- [ ] **Step 3:** Run them; expect FAIL.
- [ ] **Step 4: Implement.** `checkLanguages(doc, file, errors)`: when `doc.body.dataset.langOnly === 'en'`, skip the sibling pairing, push `${file}: English-only page has Spanish text "…"` for each `[lang="es"]`, keep the empty check. In `mountDeck`: when `doc.body.dataset.langOnly === 'en'`, call `setLang(doc, null, 'en')` instead of `initialLang`/storage, and set `lang.hidden = true`.
- [ ] **Step 5:** Run both test files and `npm run check`; expect PASS. Commit "Decks: an English-only mark for a page".

### Task 2: `mountDeck` returns an API and announces slides

**Files:** Modify `presentations/assets/deck.js`; Test `tests/presentations/deck.test.js`

**Interfaces:**
- Produces: `mountDeck(win, opts): { slides: HTMLElement[], index(): number, show(i: number, writeHash?: boolean, at?: number): void }`; after every `show`, `doc` receives `new CustomEvent('deck:slide', { detail: { index: number, slide: HTMLElement, total: number } })`.

- [ ] **Step 1: Failing tests:** `mountDeck returns the slides and the current index` (3-slide fixture of the existing `beforeEach`; expect `api.slides.length === 3`, `api.index() === 0`); `showing a slide dispatches deck:slide with its index` (listen on `document`, press ArrowRight, expect `detail.index === 1` and `detail.slide` is the second slide). The existing `beforeEach` discards the return value: capture it in these two tests.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement: the event dispatch at the end of `show` (after `announce()`), and `return { slides, index: () => current, show }` at the end of `mountDeck` (also when there are no slides). **Step 4:** Run the deck tests; PASS. **Step 5:** Commit "Decks: mountDeck returns an API and announces each slide".

### Task 3: Pitch timing, keys and chapter bar

**Files:** Create `presentations/assets/pitch.js`; Modify `presentations/assets/deck.js` (hook); Test `tests/presentations/pitch.test.js`

**Interfaces:**
- Consumes: Task 2's API and `deck:slide`.
- Produces in `pitch.js`:
  - `SLIDE_MS = 20000`, `TICK_MS = 100`
  - `chaptersOf(slides: Element[]): { name: string, first: number, count: number }[]` — consecutive slides with the same `data-chapter`
  - `fillsOf(chapters, index: number, fraction: number): number[]` — 1 for chapters before `index`, `(index - first + fraction) / count` for the current, 0 after
  - `clock(ms: number): string` → `'m:ss'`
  - `mountPitch(win, api): { key(e: KeyboardEvent): boolean, state(): 'ready'|'running'|'paused'|'done', slideElapsed(): number }`
- `deck.js`: when `doc.body.hasAttribute('data-pitch')` and not `embed`, `const pitch = mountPitch(win, api)` after the API exists; the `keydown` handler first does `if (pitch?.key(e)) { e.preventDefault(); return }`.
- DOM it builds inside `.stage`: `.pitch__bar > ol.pitch__chapters > li.pitch__seg[style="--n:<count>;--fill:<0..1>"][aria-current] (with <i> and <span>name</span>)` and `span.pitch__clock` (`0:00 / 5:00`), `span.pitch__hint` ("Space to start") shown only in `ready`. `<body data-pitch-state>` mirrors the state (CSS and the building read it).

Behaviour: starts `ready`. `key`: `' '` → ready→running, running↔paused, done→(show 0, ready); `ArrowRight`/`PageDown` → ready: start; running/paused: `api.show(index+1, true, 0)` (no-op on the last slide); `ArrowLeft`/`PageUp` → `api.show(index-1, true, 0)` (no-op on the first); `r`/`R` → `api.show(0)` and ready; anything else returns `false`. A click on `.stage` while ready starts too. Any `deck:slide` (keys, dots, Home/End, hash) resets the slide's elapsed to 0. A tick every `TICK_MS` while running adds `Date.now()` delta; at `>= SLIDE_MS` it advances **one** slide and drops the remainder, or sets `done` on the last. Clock shows `index * SLIDE_MS + elapsed`.

- [ ] **Step 1: Failing tests** (`vi.useFakeTimers()`, a 15-slide fixture with `data-chapter` 3/3/1/3/3/2, `body` `data-pitch`, `mountDeck(window, { presentations: [] })`):
  `chaptersOf` returns six chapters with `count` `[3,3,1,3,3,2]` and `first` `[0,3,6,7,10,13]`; `fillsOf(ch, 4, 0.5)` is `[1, 0.5, 0, 0, 0, 0]`; `clock(65000)` is `'1:05'`; `Space on the ready screen starts and stays on slide 1`; `ArrowRight on the ready screen starts and does not skip` (index 0, state running); `after 20 s it is on slide 2`; `after 300 s it is done on slide 15` (index 14, state `done`); `10 s paused then resumed still takes 20 s on the slide` (run 5 s, Space, advance 10 s → index 0, Space, advance 14.9 s → index 0, 0.2 s more → index 1); `one tick after a 100 s stall advances one slide` (`vi.setSystemTime(Date.now() + 100000)` then one `TICK_MS` → index 1); `a manual → resets the 20 s` (run 15 s, ArrowRight, run 19.9 s → index 1; 0.2 s more → index 2); `← on slide 1 and → on the last do not move`; `r restarts at slide 1, ready`; `a key it does not own is not handled` (`key({key:'f'})` is `false`); `embed: no bar and no state attribute` (`history.replaceState(null,'','?embed')`, mount; `document.querySelector('.pitch__bar')` null, `body.dataset.pitchState` undefined; restore the URL after); `a deck without data-pitch gets no bar`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement `pitch.js` as specified and the `deck.js` hook (import `mountPitch` from `./pitch.js`; `deck.js` returns the API object before/after as in Task 2 — build the API first, then mount the pitch). **Step 4:** Run `npx vitest run tests/presentations`; PASS. **Step 5:** Commit "Decks: a pitch mode that advances every 20 s, with a chapter bar".

### Task 4: Deck skeleton, registration, base CSS, structure test

**Files:**
- Create: `presentations/thesis/presentacion-06/index.html`, `tests/presentations/pitch-06.test.js`
- Modify: `presentations/assets/site.js`, `presentations/assets/deck.css`

**Interfaces:**
- Produces the slide contract every later task fills: `<section class="slide slide--pitch" data-chapter="<name>" data-phase="off|exploded|graph|masked|rebuilt|motif" data-place="right|left|full|corner" data-map="…">` containing `h1`, optional `p.pitch__lede`, optional `p.pitch__tag`, optional `ol.refs`. Chapter names exactly: `Topic & context`, `Innovation`, `Actors`, `Exploit`, `Impact`, `Readiness & next`.
- CSS classes defined in `deck.css`: `.slide--pitch` (transparent background so the building canvas shows; the `.stage` of a pitch gets the `--panel` background, radius and shadow a `.slide` has now), `.pitch__bar` (absolute strip at the foot of the stage, height `--pitch-bar-h: 3.4cqw`; segments sized by `flex: var(--n)`, filled by `--fill` through `i`'s `transform: scaleX(var(--fill))`; the current segment's name in `--ink`, others `--ink-tertiary`), `.pitch__clock`, `.pitch__hint`, `.pitch__tag` (mono caption, bordered, e.g. "illustrative" / "the plan"), `.pitch__lede`, `.pitch__fig` (the block that holds a slide's diagram; titles must not overlap it). Pause rule: `body[data-pitch-state='paused'] .slide *, … 'done'` → `animation-play-state: paused`; `body[data-pitch-state='ready'] .slide *`, and `html[data-embed] .slide *` → `animation: none` (so a keyframe with only a `from` leaves the final state visible). `.slide--pitch .refs` sits above the bar (`bottom: calc(var(--frame) + var(--pitch-bar-h))`). Shared motion helper: `.pitch-in { animation: pitch-in 0.8s both; animation-delay: calc(var(--at, 0) * 1s) }` with `@keyframes pitch-in { from { opacity: 0; transform: translateY(1.2cqw) } }`.

- [ ] **Step 1: Failing test** `pitch-06.test.js` (node env not needed; read the file with `readFileSync`, parse with `new DOMParser()` or `JSDOM`): `has 15 slides`; `chapters are contiguous, in order and sized [3,3,1,3,3,2]` (use `chaptersOf`); `body is a pitch, English-only` (`data-pitch`, `data-lang-only="en"`); `every slide declares data-phase and data-place from the allowed sets`; `no slide has more than 40 words outside .refs, .pitch__tag` ; `a masked or rebuilt slide carries a .pitch__tag`; `the page never says the 10 models exist` (no match for `/we have 10|our 10|10 models in hand/i`); `every number outside .refs is on the spec's list` (allowed: integers 1–15 and years 2021–2026, plus 57, 50, 148, 22, 0.926, 0.464, 0.209, 99, 81, 90, 180, 179, 83, 24, 16, 86, 91, 0.87, 0.50, 30, 9, 1, 10 — a number elsewhere fails with the slide index). It fails because the page does not exist.
- [ ] **Step 2:** Create the skeleton page modelled on `presentacion-05/index.html` head (same fonts and `../../assets/deck.css`), `<body data-track="thesis" data-presentation="presentacion-06" data-pitch data-lang-only="en">`, 15 sections with the chapters above, and these `data-phase`/`data-place`: 1 `off`/`full` · 2 `off`/`full` · 3 `exploded`/`right` · 4 `graph`/`right` · 5 `masked`/`right` · 6 `rebuilt`/`right` · 7–15 `motif`/`corner`. Each holds an `h1` with a placeholder `Slide N`. `data-map`: 1 `noardo-2021-inspection hornung-2025 clean-real-models` · 2 `gec-guzelci-2026 austern-2024` · 3 `question hypothesis` · 4 `ifc-to-graph-recipe deconstruct-for-training` · 5 `masking-training han-2025 building-graph-ai-2025` · 6 `mcp-assembles-in-revit placement-order-experiments new-not-replicated mcp4ifc-2025` · 8 `deconstruct-for-training` · 11 `hypothesis` · 13 `hands-move` · 15 `question`; none on 7, 9, 10, 12, 14. The page's module script: `import { mountDeck } …; mountDeck(window)` (the building and dots are added in T7/T8).
- [ ] **Step 3:** Register `{ id: 'presentacion-06', title: { en: 'Pecha Kucha pitch', es: 'Pitch Pecha Kucha' } }` (no date) in `site.js` `PRESENTATIONS.thesis`. Add the CSS above. Fix any test that enumerates the thesis list (`tests/presentations-index.test.js`, `tests/presentations/*`) if registration breaks it, without weakening it.
- [ ] **Step 4:** `npx vitest run` and `npm run check`; PASS. Start `npm run dev` (if the port is taken one is running), open deck 06 from the Presentations menu, press Space; confirm the bar fills and slides advance. **Define the measuring snippet once** and keep it in `docs/superpowers/plans/measure-pitch.js.txt` for later tasks: for each `section.slide` set `location.hash = '#'+n`, then flag (a) any child whose `getBoundingClientRect()` leaves the slide's, (b) any `h1` rect intersecting a `.pitch__fig` rect, (c) any `.refs` rect intersecting `.pitch__bar`, (d) any `scrollWidth > clientWidth` on text nodes; print slide numbers with findings. Commit "Pitch 06: skeleton, registration and base styles".

### Task 5: Building data with real door and window hosts

**Files:** Modify `scripts/deck-model.mjs`; Create `presentations/thesis/presentacion-06/model.json` (generated); Test `tests/presentations/deck-model.test.js`

**Interfaces:**
- Produces (exported): `project(p: object, opts?: { withHost?: boolean }): { levels, walls, floors, doors, windows, rooms }` — same output as today; with `withHost: true` each door and window also carries `host: number` (its host wall id).
- CLI: `node scripts/deck-model.mjs` is unchanged and still writes deck 04's file **byte-identical**; `node scripts/deck-model.mjs --deck=presentacion-06` writes `presentations/thesis/presentacion-06/model.json` with `withHost: true`. The module only writes when run as a script (guard on `import.meta.url`), so tests can import it.

- [ ] **Step 1: Failing tests** with a minimal `p` fixture (2 levels, 1 wall with `curve.p`, 1 floor loop, 1 door `{id, point, type, host, hand_flipped}`, 1 window, 1 room): `project keeps its output shape without host` (door has no `host` key); `project with withHost adds the host wall id to doors and windows` (`doors[0].host === <wall id>`); `importing the module writes nothing` (spy `fs.writeFileSync`, import, expect not called — mock `node:fs`).
- [ ] **Step 2:** Run; FAIL. **Step 3:** Refactor to export `project`, thread `withHost` into `opening`, add the `--deck` argument and the main guard. **Step 4:** Run the tests; then `node scripts/deck-model.mjs` and confirm `git status` shows no change to deck 04's `model.json`; then `node scripts/deck-model.mjs --deck=presentacion-06` and check the new file has 83 doors and 24 windows with a `host`. **Step 5:** Commit "Pitch 06: building data with door and window hosts".

### Task 6: Building geometry and phases (pure)

**Files:** Create `presentations/assets/pitch-building.js`; Test `tests/presentations/pitch-building.test.js`

**Interfaces — Produces (all pure, exported):**
- `PHASES = ['off','exploded','graph','masked','rebuilt','motif']`
- `PLACES: Record<'right'|'left'|'full'|'corner', { cx: number, cy: number, scale: number }>` with `right {0.68,0.5,0.9}`, `left {0.3,0.5,0.9}`, `full {0.5,0.5,1}`, `corner {0.9,0.82,0.3}`; `placeOf(name: string): Place` (unknown → `full`)
- `Pt = { x, y, z, kind: 'wall'|'floor'|'door'|'window'|'room', id: number, level: number, cx, cy, cz, first: boolean }` (`cx,cy,cz` the element's centroid; `first` marks one point per element)
- `pointsOf(model, opts?: { max?: number }): Pt[]` — samples `model.source`: walls every 0.9 m along and up (curtain walls too), floors on a 1.5 m grid inside the polygon, openings 5 points, rooms 1 point; thins deterministically to `max` (default 5000)
- `levelOf(z: number, levels: {z:number}[]): number` — index of the highest level with `z <= value + 0.05`
- `edgesOf(model): { a: number, b: number }[]` — one per door/window whose `host` is a wall id present in `model.source.walls`
- `isMasked(pt: Pt): boolean` — the illustrative mask is the openings (`door`/`window`)
- `targetOf(pt: Pt, phase: string, ctx: { gap: number }): { x, y, z, a }` — `off`: assembled, `a 0`; `motif`: assembled, `a 0.9`; `exploded`: `z + level*gap`, `a 1`; `graph`: at `(cx,cy,cz + level*gap)`, `a 1` only for `first`, else 0; `masked`: as `graph` but masked points `a 0.1`; `rebuilt`: assembled, `a 1`
- `delayOf(pt: Pt): number` in `[0,1)` from the id (a stable hash) — the stagger
- `ease(t: number): number` easeInOutSine, clamped to `[0,1]`

- [ ] **Step 1: Failing tests** on a fixture model (one wall 3 m × 2.7 m, a floor square 4 m, one door and one window hosted on the wall, one room, 2 levels at z 0 and 3): `pointsOf returns wall points inside the wall's extent`; `pointsOf is deterministic and honours max`; `levelOf picks the level below`; `edgesOf has one edge per hosted opening and ignores a host that is not a wall` (add an opening with host `999`); `targetOf exploded lifts a level-1 point by gap` (`gap 6` → `z + 6`); `targetOf graph keeps only first points`; `targetOf masked dims the openings to 0.1 and leaves walls at 1`; `targetOf off has alpha 0`; `ease(0)=0, ease(1)=1, ease(0.5)=0.5, monotonic`; `placeOf falls back to full`; `delayOf is stable and within [0,1)`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS. **Step 5:** Commit "Pitch 06: building geometry and phases".

### Task 7: Building canvas

**Files:** Modify `presentations/assets/pitch-building.js`, `presentations/assets/deck.css`, `presentations/thesis/presentacion-06/index.html`; Test `tests/presentations/pitch-building.test.js`

**Interfaces:**
- Consumes: Task 6 functions; Task 2's `deck:slide`; Task 3's `body[data-pitch-state]`.
- Produces: `project3(p: {x,y,z}, cam: { yaw: number, pitch: number }): { x: number, y: number, depth: number }` (orthographic; plan x,y with z up) and `mountBuilding(win, model, opts?): { phase(): string, place(): string, destroy(): void } | null` — `null` when there is no `.stage` or no 2D context.

Behaviour: one `<canvas class="pitch-building" aria-hidden="true">` as the first child of `.stage`, sized to the stage in device pixels, `pointer-events: none`, painted behind the slides. On mount it reads the currently shown slide, then follows `deck:slide`. A phase change tweens every point from its current state to `targetOf` over 1.4 s with `delayOf(pt) * 0.3 s` stagger and `ease`; the frame (`place`) glides with the same ease. Slow yaw (0.04 rad/s). Draws square dots 0.18 cqw, colour from `--ink` (alpha per point), masked/rebuilt openings in `--flow-engine`; in `graph`/`masked` it draws `edgesOf` lines in `--ink-secondary` at alpha 0.25. Time only advances while `body.dataset.pitchState` is `running` or unset; with `ready`, `paused` or `done` it holds, and in `ready`, in `html[data-embed]` and under `prefers-reduced-motion` it snaps to the target. `destroy()` cancels the frame and removes the listener. Colours are re-read when `data-theme` changes.

- [ ] **Step 1: Failing tests** (stub `HTMLCanvasElement.prototype.getContext` to a recording fake): `mountBuilding returns null without a stage`; `returns null when the canvas has no context`; `it starts on the shown slide's phase and place` (slide with `data-phase="graph" data-place="left"` → `phase()==='graph'`, `place()==='left'`); `it follows deck:slide` (dispatch an event with a slide `data-phase="rebuilt"`); `destroy removes the canvas`; `project3 at yaw 0 maps plan x to screen x and z up to screen y negative`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. In `index.html` module script: `fetch('model.json').then(r => r.json()).then((m) => mountBuilding(window, m))` after `mountDeck`. **Step 4:** Run; PASS. In the browser, step through slides 3→7 and watch the building explode, become a graph, mask, rebuild and shrink to the corner; check both themes and run the measuring snippet. **Step 5:** Commit "Pitch 06: the building canvas".

### Task 8: Dot fields

**Files:** Modify `presentations/assets/pitch.js`, `presentations/assets/deck.css`, `presentacion-06/index.html`; Test `tests/presentations/pitch.test.js`

**Interfaces:** Produces `mountDotFields(doc: Document): void` — for each `.dotfield[data-total][data-lit]` appends `data-total` `<i>` children, the first `data-lit` marked `data-lit`; unlit dots dim with `animation-delay: calc(var(--i) * 18ms + var(--at, 1) * 1s)` via an inline `--i`.

- [ ] **Step 1: Failing tests:** `creates data-total dots` (57), `marks the first data-lit as lit` (10), `does nothing without the attributes`. **Step 2:** FAIL. **Step 3:** Implement; CSS: `.dotfield` a grid of 0.9cqw dots, `i` `--ink`; unlit ones animate to `--separator` colour with `animation: dot-dim 0.6s both` (keyframes `from` only). Call it from the page script before `mountDeck`. **Step 4:** PASS. **Step 5:** Commit "Pitch 06: dot fields".

### Task 9: Slides 1–3 (chapter: Topic & context)

**Files:** Modify `presentacion-06/index.html`, `deck.css`; the deck test in T4 must keep passing.

Draft copy (English, edit freely within the spec's ideas; keep figures exact):
- **1** `h1` "Most real BIM models are not ready to teach an AI." Two `.pitch__fig` blocks: `.dotfield data-total="57" data-lit="10"` captioned "Noardo 2021 · 57 models · 5–10 usable as they are", and `.dotfield data-total="50" data-lit="22"` captioned "Hornung 2025 · 50 files from 148 offices · 22 usable". `.refs`: Noardo et al. 2021, *An Inspection of IFC Models from Practice* (doi 10.3390/app11052232); Hornung et al. 2025 (doi 10.25442/hku.29365832); then a plain line "Samples from research partners and one region: a pattern, not a census." Speaker-only caveats (Hornung's strict six-class filter; many of Noardo's files from one project) go in the T13 script.
- **2** `h1` "The data sits inside each office, and does not carry over." `.pitch__fig` 1: an SVG office outline holding a stack of file rectangles (the data lake). `.pitch__fig` 2: three falling bars (CSS, heights from `--v`): "one project 0.926", "hospital → office 0.464", "+ third typology 0.209" (Gec & Güzelci 2026, Macro-F1, door leaf material), and a line "Austern 2024: over 99% → 81–90% on a file left out". `.refs` with both papers (dois from `map.json` `source.original`).
- **3** `h1` "Can we decompose BIM models into meaningful parts and use them to generate new, valid models?" `p.pitch__lede` "If a model is decomposed into elements and relations, an AI can find the patterns to build something similar." Chapter 1 ends with the building exploding at the right.

- [ ] **Step 1:** Write the three slides with `.pitch-in` entrances staggered by `--at` across the 20 s (key idea by 1 s, evidence 4–12 s, source line 14 s). **Step 2:** `npx vitest run tests/presentations` and `npm run check`; PASS. **Step 3:** In the browser, in light and dark, run the measuring snippet on slides 1–3, in `ready` (complete state) and while running; fix findings. **Step 4:** Commit "Pitch 06: the need, the paradox and the question".

### Task 10: Slides 4–6 (chapter: Innovation)

**Files:** Modify `presentacion-06/index.html`, `deck.css`.

Draft copy:
- **4** `h1` "Step 1: take a model apart." Support (one line each, from `pipeline/out/summary.json`): "Round trip, no AI: 180/180 walls rebuilt (179 in place) · 83/83 doors · 24/24 windows · 16/16 floors". `.pitch__tag` "Autodesk sample project". Graph phase draws the real host edges. `.refs`: `pipeline/out/summary.json`, Nov 2026, plus the line "Rooms rebuild less well: 86 of 91 stay enclosed."
- **5** `h1` "Step 2: learn by hiding." `p.pitch__lede` "Hide part of a model; the AI predicts it." `.pitch__tag` "the plan · illustrative". Support: "BIGNet (Han 2025): half the nodes masked; with 30% of the labels, F1 0.87 vs 0.50 without pretraining." `.refs`: Han et al. 2025 (doi 10.1111/mice.70073).
- **6** `h1` "Step 3: the AI proposes, MCP builds in Revit." Three `.pitch__fig` tracks labelled "all at once", "one by one", "one and its neighbours", each a row of squares that fill in a different order (CSS, `--at`). A last line "New, not a copy: learn from 9 models, test on 1 it has not seen." `.pitch__tag` "the plan · illustrative". `.refs`: MCP4IFC 2025 and Building-Graph-AI 2025 (dois from `map.json`).

- [ ] **Step 1:** Write the slides; phases already set in T4. **Step 2:** tests and check; PASS. **Step 3:** Browser measuring, both themes; confirm the real edges show on slide 4 and the openings dim on slide 5. **Step 4:** Commit "Pitch 06: the method in three steps".

### Task 11: Slides 7–10 (chapters: Actors, Exploit)

**Files:** Modify `presentacion-06/index.html`, `deck.css`.

Draft copy; the building is the corner motif on all four:
- **7** `h1` "Two actors." Two nodes, "Data owners · AEC offices" and "Tool developers", the pipeline between them; arrows animate: "models" → pipeline → "method + MCP".
- **8** `h1` "What we exploit: the parts." `p.pitch__lede` "Elements and relations from real models, as a dataset." Element tiles in a grid, a few masked.
- **9** `h1` "How: inside the office." `p.pitch__lede` "The pipeline runs on its own models; only the derived dataset leaves." Reuse the office outline of slide 2 with the pipeline inside it.
- **10** `h1` "To whom: offices first." `p.pitch__lede` "An open invitation: 10 of your Revit models → a decomposed dataset and a first masking test. You keep the pipeline." Then a second, later line "Then tool developers." No wording that says an office has agreed.

- [ ] **Step 1:** Write the slides. **Step 2:** tests and check; PASS. **Step 3:** Browser measuring, both themes. **Step 4:** Commit "Pitch 06: actors and how it is exploited".

### Task 12: Slides 11–15 (chapters: Impact, Readiness & next)

**Files:** Modify `presentacion-06/index.html`, `deck.css`.

Draft copy; qualitative only, no invented numbers:
- **11** `h1` "Short term: a method and a pipeline." `p.pitch__lede` "Results on 10 models of one typology." `.pitch__tag` "goal by the end of the thesis".
- **12** `h1` "Long term: a Revit co-pilot." `p.pitch__lede` "Trained on each office's own data." `.pitch__tag` "horizon".
- **13** `h1` "Impact." Two columns: "Technological · real models become training data" and "Professional / social · from drawing to criteria and choice; the data stays in the office".
- **14** `h1` "Technology readiness." A 1–9 scale, marker "now 3" and target "4 · validated in the lab", with the four steps between: "gather 10 models and mask them", "MCP assembling in Revit", "the three placement orders", "the new-vs-copied test". The marker slides from 3 toward 4.
- **15** `h1` "Where I am, and what I need from you." Two lines: "What should be hidden first?" and "How do we prove it is new, not a copy?"; then "G. Ramón García Ayala · MaCAD, IAAC".

- [ ] **Step 1:** Write the slides. **Step 2:** tests and check; PASS. **Step 3:** Browser measuring, both themes. **Step 4:** Commit "Pitch 06: impact, readiness and the close".

### Task 13: Rehearsal script

**Files:** Create `presentations/thesis/presentacion-06/script.md`; Test `tests/presentations/pitch-06.test.js`

- [ ] **Step 1: Failing test:** `the script has 15 sections of 40–60 spoken words` (sections start with `## N ·`; count words excluding the heading) and `the script carries the two caveats` (contains "six-class filter" and "one project"). **Step 2:** FAIL. **Step 3:** Write the script: 15 sections, English, first person, about 45–55 words each, saying what the slide shows and nothing the slide or spec does not support (the two caveats go in sections 1; the plan-not-result wording in 5, 6, 10, 11). **Step 4:** PASS. **Step 5:** Commit "Pitch 06: rehearsal script".

### Task 14: Final verification

- [ ] **Step 1:** `npm run check` and `npx vitest run`: all pass; report counts.
- [ ] **Step 2:** In the browser: open the deck, press Space, confirm slide 2 at 20 s and slide 3 at 40 s by reading `.stage section:not([hidden])` `data-folio`; confirm the chapter bar's current segment changes at slide 4; press Space to pause and resume; reload and confirm `ready`; open with `?embed` (or from the map's viewer) and confirm no bar and no advance; switch light/dark; emulate `prefers-reduced-motion` and confirm it still advances. The full 5:00 is covered by the fake-timer test.
- [ ] **Step 3:** Run the measuring snippet on all 15 slides, in both themes; no findings.
- [ ] **Step 4:** Confirm decks 04 and 05 still open, show their language button and builds, and that `git status` shows only this plan's files plus the author's untouched ones. Do not push; report the branch and ask the author whether to open the PR.
