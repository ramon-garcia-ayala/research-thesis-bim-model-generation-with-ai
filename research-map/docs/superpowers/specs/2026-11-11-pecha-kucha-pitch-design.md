# Pecha Kucha pitch for the Research Methodologies class (deck 06) — design

Date: 2026-11-11 · Status: approved by the author in conversation, 2026-11-11 (this document is the write-up of it)

## Intent

The author's *Research and Methodologies* class (MaCAD, IAAC) asks each student for a **Pecha Kucha pitch**: 5 minutes,
at most 15 slides, 20 seconds per slide, to **convince the class that there is a need for the research**. The brief says
the slides must cover: research topic and context · the innovation · who the actors are · what aspects to exploit, how
and to whom · the impact wanted (short and long term; the dimensions: social, technological…) · the technology readiness
level (TRL) hoped for by the end of the thesis. The audience is a professor who wants to know **how the thesis is going**.

The author wants it to feel like a pitch to someone who could help (an investor's attention, not a progress report), with
**motion graphics**, derived from deck 04 (same research, other format and content), and with the style of the motion the
author already built for their portfolio site.

The thesis (do not reopen): *Can we decompose BIM models into meaningful parts and use them to generate new, valid
models?* Hypothesis: *if a BIM model is decomposed into its elements and relations, an AI can find the patterns it needs
to understand how to build something similar.* Direction approved by the supervisor on 2026-11-10: step 04 learns by
**masking**; step 05 assembles through an **MCP server for Revit**, with `rebuild.py` as the no-AI control.

Success: in 5 minutes the class can say (1) why this is needed, (2) what the author does that is new, (3) who benefits
and how, (4) where the work stands and where it will stand. The author can deliver it with no notes, because each slide
carries one idea.

## Decisions (the author, 2026-11-11)

| Topic | Decision |
|---|---|
| Format | A new deck, `research-map/presentations/thesis/presentacion-06/`, derived from deck 04 (its CSS system, its `model.json`). Registered in `presentations/assets/site.js`. |
| Language | **English only.** The class works in English. The ES button and every Spanish duplicate are not wanted. |
| Pace | **Automatic, one slide every 20 s**, 15 slides = exactly 5:00. A discreet time bar, pause with a key. |
| Hook | **The data is the problem, generalized:** not one study's number, but what several independent studies agree on, with the sources named as literature. |
| Actors | Two: **data owners** (AEC offices) and **tool developers**. |
| What to exploit | **The decomposed parts** (elements and relations) **as a dataset**, first for the offices. |
| TRL | Declared for the end of the thesis: **TRL 4**, validated in the laboratory. The starting point is TRL 3 (the author's reading, see "Calls the author did not make"). |
| Dimensions | **Technological** and **professional / social**. Not environmental, not economic (no evidence of its own). |
| Close | One closing slide **for the class** (where the thesis is, what feedback is needed). No second version for the author's office; that pitch is a separate piece, later. |
| Chapter bar | **Added after the plan was approved:** a bar at the bottom that shows the stage the pitch is in, as chapters, filling as the pitch advances. |

## Goals, non-goals, anti-goals

Goals
- 15 slides, 20 s each, one idea per slide, little text, room to breathe (the author's standing rule for presentations).
- Motion that tells the story: one building (from the author's own model) is **taken apart, masked and put back** across
  the pitch; each slide picks it up in another phase.
- Every slide answers a topic of the brief, and the chapter bar shows which one, so the professor can tick the list.
- Every figure comes from a paper the author read or from `pipeline/out/`. Sources sit at the foot of the slide.

Non-goals
- A second language, a printed handout, a reusable "pitch" framework, or any change to how decks 01–05 behave.
- The pitch for the author's office (different audience, different closing) and any selling of GFit.
- Training or building the AI: the pitch **announces the method, it does not claim results from it**.

Anti-goals: it fails, even if it runs, when
- a single study's number is presented as "the industry's" (the author's own objection to the first draft);
- it says or implies that the AI is already trained, or that masking or MCP already work (today only the no-AI round
  trip runs);
- a slide holds more than the presenter can say in 20 s (as a guide, no more than about 25 words on screen);
- an impact figure is invented (hours saved, money, percentages): impact is qualitative;
- the pitch-mode machinery changes how any other deck is shown.

## Constraints

From `CLAUDE.md` and `research-map/README.md`:
- Commands from `research-map/`: `npm run dev` (http://127.0.0.1:4322/; if the port is taken, one is already running),
  `npm run check`, `npx vitest run`. Both pass before a commit.
- **Branch first; never commit to `master`.** Commit only this session's work: the author's own changes
  (`research-map/reading/*`, `research-map/papers/renner-2025/graph.json`, `debug.log`, `notes/`, `map.json` edits) stay
  out unless asked.
- `data-map` ids on a slide must exist in `map.json` (nodes, groups, `question`, `hypothesis`). External links only in
  `.refs`, opening in a new tab with `rel="noopener"`. Links relative.
- Colours as tokens in `assets/deck.css`, light and dark; components live in `deck.css`; fonts only from Google Fonts.
- Layout is checked by **measuring in the browser** (overflow, a title clashing with a diagram), not by screenshots
  (screenshots of the deck time out in Claude in Chrome here). Turn transitions off before measuring.
- Respect `prefers-reduced-motion`: the pitch still advances every 20 s, with the motion reduced to simple fades.
- The checker (`scripts/check-presentations.mjs`) today **requires every text in both languages** (`lang="en"` and
  `lang="es"` as siblings, none empty). English-only needs an explicit, per-deck exemption (see "Pitch mode").
- The portfolio repo (`grga-portfolio-site`, a sibling folder) is a **read-only reference**: its motion is ported as ideas
  in this deck's own code. Nothing is imported from it, nothing in it is changed. Its rule "dark, no white fields" does
  **not** apply here: the deck keeps its light and dark themes.

## The pitch, slide by slide

Chapters (the bar): **1 Topic & context** (slides 1–3) · **2 Innovation** (4–6) · **3 Actors** (7) · **4 Exploit** (8–10)
· **5 Impact** (11–13) · **6 Readiness & next** (14–15). They are the brief's own list, so the class can follow it.

Each slide below: idea → what is on screen and what moves → sources. Wording is a draft the author edits; the ideas and
the figures are fixed.

**1 · The hook — the data is the problem** (chapter 1)
Idea: *Most real BIM models are not ready to teach an AI.* Said as what independent studies agree on. On screen: **two
fields of points, one per study, each with that study's own real count** (the two figures count different things, so
they are never merged into one field or one percentage); most points go dark and a few stay lit, then each source
appears as a short line beside its field. Two sources, not three (the third source in the first draft was an error;
Gec and Austern live on slide 2).
- Noardo et al. 2021: 57 IFC models from practice; for every use case, **no more than 5 to 10 of 57** could be used as
  they are (`noardo-2021-inspection`).
- Hornung et al. 2025: of 148 offices contacted in Germany and Austria, 50 IFC files received, **22 usable**
  (`hornung-2025`, `clean-real-models`).
Footnote (honest): *Samples from research partners and one region; they show a pattern, not a census.* Never "the
industry loses X%". Two caveats from the author's own notes go in the footnote or the speaker text: Hornung's strict
six-class filter causes part of its loss, and many of Noardo's files come from one project. The word "usable" is
always paired with whose definition it is (Noardo: usable *as they are* for a use case; Hornung: usable *for its
six-class graph*).

**2 · Context — the paradox** (chapter 1)
Idea: *Every office already owns the data, but locked in, one-off and not ready to learn from; and what one project
teaches does not carry to another.* On screen: a stack of project files inside an office outline (the data lake), then
two bars falling.
- Gec & Güzelci 2026: door specification, Macro-F1 **0.926 within one project → 0.464 hospital to office → 0.209**
  adding a third typology (`gec-guzelci-2026`).
- Austern et al. 2024: over 99% / 98% on files seen in training, **81–90% on a file left out** (`austern-2024`).
So the useful data is the office's own, and cannot be bought or shared as it is.

**3 · The topic — question and hypothesis** (chapter 1)
Idea: the research question and the hypothesis, verbatim from the README. On screen: the building (from the author's
`model.json`) assembled; as the hypothesis lines come in, it **separates into strata and elements**. This is the first
appearance of the motion thread. `data-map="question hypothesis"`.

**4 · Innovation, 1 of 3 — decompose and label** (chapter 2)
Idea: *Take a model apart into elements and relations.* Revit model → JSON graph (nodes = elements, edges = relations).
Evidence that it works: the no-AI round trip, source vs rebuilt from `pipeline/out/summary.json`: **180/180 walls,
16/16 floors, 83/83 doors, 24/24 windows, 5/5 levels**, doors and windows keep their host. Honest note on the slide or
the footnote: 179 of 180 walls in place; rooms rebuild imperfectly (86 of 91 enclosed). Cite `ifc-to-graph-recipe`,
`cbim-2023` if useful. Motion: elements peel off the building and link as a graph.

**5 · Innovation, 2 of 3 — learn by masking** (chapter 2)
Idea: *Hide part of a model and ask the AI to fill it in.* Approved by the supervisor; does not have to be a graph
network. On screen: the graph with a part masked, a prediction appearing, compared with what was hidden. Support from
the literature (not from the author's results): Han et al. 2025 mask half the nodes of 176 Revit graphs and, reusing the
encoder with 30% of the labels, reach F1 **0.87 against 0.50 without pretraining** (`han-2025`); Hornung removes one
node and predicts it; Liang et al. mask interior walls (`building-graph-ai-2025`). Mark the slide *the plan*, not a
result. Open on the slide or in the notes: what is hidden (an element, a relation, a class, a subgraph) and how much.

**6 · Innovation, 3 of 3 — build through MCP, and tell new from copied** (chapter 2)
Idea: *The AI proposes; an MCP server builds it in Revit; the order of placing is the experiment.* On screen: proposals
becoming elements in the building; three small tracks for the three orders (**all at once · one by one · one and its
neighbours**); a last beat for *new, not a copy*: the 9 models it learns from vs the 1 held out (`new-not-replicated`,
`placement-order-experiments`, `mcp-assembles-in-revit`, `mcp4ifc-2025`). `rebuild.py` stays as the no-AI control. Also
plan, not result.

**7 · Actors** (chapter 3)
Idea: *Two actors and what moves between them.* The author liked this part of the draft; keep its spirit. Data owners
(AEC offices: they hold the models) and tool developers (they build what offices use). On screen: two nodes around the
pipeline; models flow from offices into the pipeline, and the trained method and the MCP flow toward the developers.

**8 · What to exploit** (chapter 4)
Idea: *The decomposed parts: elements and relations, taken from real models, as a dataset.* On screen: the building's
parts laid out as a catalogue of examples, a few masked.

**9 · How** (chapter 4)
Idea: *The pipeline runs inside the office, on its own models; the files do not leave.* On screen: the office outline
from slide 2 with the pipeline inside it, only the derived dataset leaving as a small arrow, the model files staying.

**10 · To whom** (chapter 4)
Idea: *First the offices, then the tool developers.* The pilot: **10 of an office's own Revit models → a decomposed
dataset and a first masking test**; the office keeps the pipeline. The developers come after, through the trained method
and the MCP server. (The order, offices first, is the author's choice of "primary beneficiary"; the pilot wording is a
draft.)

**11 · Impact, short term** (chapter 5)
Idea: *By the end of the thesis: a method and a pipeline, and results on the author's 10 models.* Qualitative.

**12 · Impact, long term** (chapter 5)
Idea: *A co-pilot in Revit trained on each office's own data.* Qualitative, labelled as the horizon, not a promise.

**13 · Dimensions** (chapter 5)
Idea: two columns. **Technological:** a method that turns real models into training data. **Professional / social:**
modellers move from drawing to criteria and choice (`hands-move`), and an office's data stays in its hands. No
environmental or economic column.

**14 · Technology readiness** (chapter 6)
Idea: the TRL 1–9 scale with a marker **now at 3** (the no-AI round trip runs in the lab on one sample model) and a **target
at 4** (validated in the laboratory). Between them, the four steps that get there: masking on the 10 models · MCP
assembling in Revit · the three placement orders · the new-vs-copied test.

**15 · Close** (chapter 6)
Idea: *Where the thesis is, and what feedback is needed.* The two open questions the author wants help with: **what to
hide first**, and **how to prove that what is generated is new and not a copy**. Name and "MaCAD, IAAC". No product
promise.

Each slide also gets speaker text for rehearsal: about 45–55 spoken words per slide (about 20 s), in English, kept
**outside the slide**, in a separate file in the deck's folder. It is a rehearsal aid, not on screen.

## Pitch mode (what to build in the deck engine)

A deck turns into a pitch by a mark on its page, so decks 01–05 are untouched. Shape, with the author's decisions marked:
- **Auto-advance, 20 s per slide** (decided). Starts on the presenter's first key or click, so they are ready before it
  runs. Space pauses and resumes; ← and → skip a slide and restart its 20 s; a key restarts the whole pitch.
- **English only** (decided): a per-deck mark makes the checker accept slides without a Spanish sibling, still rejects
  empty text, and the deck hides the language button. The rule stays in force for every other deck.
- **Chapter bar** (decided, at the foot of the slide): six segments, one per chapter above, sized by their slide count;
  completed ones full, the current one **filling with the elapsed time**, the rest empty; the current chapter's name
  shown. It must not collide with the sources at the foot of a slide (`.refs`); the builder settles the stacking.
- **Not in pitch mode when embedded** (`?embed`, the map's viewer): there no one presents, so no auto-advance. Slides show
  complete, like the other decks.
- Motion belongs to the slide and runs by time inside its 20 s, not by clicks (the decks' click-by-click builds are not
  used). Slide changes may keep the existing cross-fade.
- A visible-but-quiet total clock (elapsed of 5:00) for rehearsal; it can hide with the controls like the rest.

## The motion thread

One building, taken from `model.json` (deck 04's views of the original and the rebuilt Revit model; the script
`node scripts/deck-model.mjs` rebuilds it from `pipeline/out/`). **It is Autodesk's sample project
(`racadvancedsampleproject.rvt`), not an office's model**, and the slides say so wherever it appears with a claim
(slides 4 and 14): it is a clean sample, which is why the round trip proves the mechanics and the pilot on slide 10 is
what tests real, messy models. **Real data vs illustration:** the building shows only what the pipeline really extracts
(levels as strata, element categories as labels, the door and window hosts as edges, from `pipeline/out/source.json`,
which means extending `scripts/deck-model.mjs`). Whatever is not built yet (the step-03 classes, wall-to-wall relations,
a mask's prediction, MCP placement) is **drawn as illustration and labelled "illustrative"** on the slide, so a
prediction that matches what was hidden never reads as a result. It is assembled, **separates into strata and
elements** (slide 3), **peels into a graph** (4), **loses a part to a mask** (5), **is rebuilt through proposals** (6),
and returns, small, as a motif on later slides. The motion vocabulary comes from the author's portfolio, read-only, in
`grga-portfolio-site/design-lab/kit/` and `apps/portfolio/components/deck/engine.ts`: `intro.js` (a building drawn
assembled, exploding into labelled strata with a point-cloud look), the `GlyphEngine` (particles morphing between shapes,
easeInOutSine, 1.15–1.6 s with a staggered start), `aura.js` (grain gradient), `eco.js` (the ecosystem diagram, relevant
for slide 7) and `fade.js` (eased fades). Port the ideas, in this deck's tokens and themes.

## The 10 models are a plan (the author, 2026-11-11)

The "10 Revit models of one typology, 9 to learn from and 1 kept unseen" is **a plan decided on 2026-11-09, not models in
hand** (today `pipeline/input/` holds only the Autodesk sample). Everywhere the pitch mentions them it reads as a plan:
- Slide 6: "the plan: learn from 9 models, test on 1 the AI has not seen".
- Slide 10: an **open invitation** to an office that wants to contribute its own models ("10 of your own Revit models →
  a decomposed dataset and a first masking test; you keep the pipeline"), not a pilot under way.
- Slide 11 (short term): "results on 10 models of one typology" is the **goal** for the end of the thesis, worded as such.
- Slide 14: the first of the four steps to TRL 4 is "gather 10 models and mask them".
Nothing on screen says the models exist, or that an office has agreed.

## Calls the author did not make (mine, to review)

- Chapter names and where the six cut (the brief's own topics).
- Slide order of 8–10 and the "offices first, developers second" ordering.
- The pilot wording on slide 10 (10 models, decomposed dataset, a first masking test).
- "Now TRL 3" on slide 14: my reading of the round trip, not something the author said.
- The impact wording on slides 11–13.
- The rehearsal text outside the slides.
- The six-chapter bar as the way to show the stages (the author asked for "a bar, like chapters").
- Slide 1 shows two sources, one field each; the building is labelled as Autodesk's sample; what is not built is drawn
  and labelled "illustrative" (the builder check raised these; I settled them).

## Left to the builder

Component and class names; the exact stacking of the chapter bar and the sources; how the motion is drawn (SVG, canvas or
CSS) and its timings; the file layout of the pitch-mode code and whether it is a module of `deck.js` or beside it; the
check and tests for the pitch (at least: 15 slides, 20 s each by fake timers, chapters cover all slides, English-only
mark accepted by the checker and not by the other decks); the deck's title and meta description; the order of work.

## Open

None that block planning. The author may still edit the wording of any slide's text. The builder check (a reader with
no access to the conversation) raised four questions; three are settled above as my calls, and the fourth (the 10
models) was answered by the author.
