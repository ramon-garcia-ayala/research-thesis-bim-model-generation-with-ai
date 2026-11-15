---
name: paper-research
description: Use when the author asks to research a topic in the literature for the thesis — "investiga papers sobre…", "busca papers de…", "research masking", "qué hay publicado de…", "/paper-research <tema>" — or to find, validate and bring new papers into the research-map paper reader (to read or listen to them). Not for reading or repairing a paper already in the library.
---

# Paper research

Find papers on the topic the author names, keep only the ones that are real and on point, write what they say, and
offer to bring them into the research map's reader. The session's model (Fable or Opus) orchestrates and writes; cheap
subagents search and check. Talk to the author in Spanish (Mexico); files, ids and commit messages stay in English.

## The team

| Role | Agent (`.claude/agents/`) | Model | Gets | Returns |
|---|---|---|---|---|
| Orchestrator | this session | Fable or Opus | the author's answers | questions, plan, report, import |
| Scout | `paper-scout` | haiku | one sub-question, queries, sources, the known list | up to 8 **cards** |
| Validator | `paper-validator` | sonnet | the cards of one sub-question and the criteria | accept / reject / doubt per card |
| Librarian | `paper-librarian` | haiku | the accepted cards, `map.json` groups and ids | an import proposal, one row per paper |
| Importer | `paper-importer` | sonnet | the papers the author approved | each paper prepared in the reader, or why not |

If a subagent type is not listed by the Agent tool (agents added mid-session load on the next start), dispatch
`general-purpose` with the agent's `model` and paste the body of its `.claude/agents/<name>.md` above the task.
If auto mode answers that a hook changed the call's input, re-issue the Agent calls with exactly the input it quotes,
alone in that message.

## Run

Make a todo per step.

1. **Context (orchestrator, no agents).** From `research-map/`: read the current research question (last entry of
   `map.json` → `centre.question`), the idea nodes that touch the topic, and any `reports/` or `research_notes/` on it.
   Build the known list into the scratchpad and pass its path to every scout and validator (not its text):

   ```bash
   node -e "const m=require('./map.json');for(const n of m.nodes.filter(n=>n.kind==='paper'))console.log([n.id,n.cite,n.source?.original].join(' | '))" > "<scratchpad>/known.txt"
   ```

2. **Ask (AskUserQuestion, one call, up to 4 questions, every question with one option marked "(Recomendado)" first).**
   Questions come from what step 1 found, not from a fixed list. Always cover:
   - *Ángulo*: 2–4 framings of the topic written against the thesis (e.g. for masking: what to hide, which model fills
     it, placement order, new vs copied).
   - *Profundidad*: rápida (≈5 aceptados, 2 scouts), normal (≈10, 3–4 scouts), amplia (≈20, 4–5 scouts, 2 rounds).
   - *Qué cuenta*: only papers with an open PDF / also closed ones as metadata / also datasets and code.
   - *Al terminar*: ask me before importing / import the accepted ones with an open PDF / report only.

3. **Plan.** Split the topic into one sub-question per scout. For each: 4–8 queries (synonyms in the field's words and
   in AEC words: "masked autoencoder graph", "masked element prediction BIM"…) and the sources that fit, from
   [sources.md](sources.md). Say the plan in 3–5 lines and go on; do not ask again.

4. **Search.** Dispatch all scouts in one message (parallel). Each prompt: the research question, the sub-question,
   its queries and sources, the known list, the inclusion criteria from step 2, and the card cap.

5. **Validate.** One validator per scout's cards, all in one message. The validator sees only the cards and may open
   the abstract or the PDF's first page to check them; it never searches for new papers.

6. **Loop (max 2 more rounds).** If accepted < the depth's target, send scouts again with what was rejected and why,
   new queries, and forward/backward snowballing from the accepted papers (their references, "cited by" in
   OpenAlex). Stop when a round adds fewer than 2 accepted papers and say so.

7. **Write (orchestrator).** In `research-map/research_notes/<Topic>/` one note per sub-question (English, the card
   table with verification labels, below), and `research-map/reports/<Topic>.md` in Spanish: claims with inline links,
   numbers only as the papers state them, inferences marked as such, and a closing section on the search's limits
   (sources used, counts screened, what failed, what the author should run by hand in CumInCAD). Show the author a
   5-line summary, not the report.

8. **Import gate.** When accepted ≥ 5 (or at the end), dispatch the librarian with the note paths. Save its table to
   `<scratchpad>/librarian-<topic>.md` (the importer reads it from there). Then AskUserQuestion with
   `multiSelect: true`. Up to ~12 papers: one option per paper (title + why, 4 per question). More than that: first
   option "Núcleo de N (Recomendado)" — one or two of the strongest per sub-question — then one option per remaining
   sub-question group. A second question asks what to do with the papers without a checked PDF (map node with link and
   note, or report only).

9. **Import.** One importer, sequential (all papers share `map.json` and `papers/index.json`). Pass the librarian's
   rows for the approved papers and the idea node they link to. Afterwards run `npm run check` and `npx vitest run`
   in `research-map/` and report the result as it is.

10. **Close.** List what changed. Commit only if the author asks, on a branch, never on `master`, and only this run's
    files.

## The card (what scouts return, validators judge, notes keep)

```
- title: exact title
  authors: all, as printed
  year_venue: 2024, CAADRIA vol. 1 pp. 303–312
  id: doi:10.… | arXiv:2xxx.xxxxx | none
  pdf: URL | none            pdf_check: OK | OK† | 403 | not tried
  license: as stated | none stated
  what_it_does: two sentences, the paper's own words where possible
  why_here: one sentence against the sub-question
  relevance: high | medium | low
  verified: PDF-read | PDF-partial | abstract-only | metadata
```

Verification labels and the PDF check mean what they mean in
`research_notes/Descomponer IFC reales y generar nuevos/assembly_methods.md`: "PDF OK" = HTTP 200 and the bytes start
with `%PDF-`; † = checked with TLS verification off.

## Rules

- Every number in a note or the report comes from a paper that was opened; anything else is marked *(inferencia)*.
- A paper already in the known list is not a result; mention it only as context.
- Do not send the author's name, email or project to any search service.
- PDFs in `files/` may carry NC/ND licenses: the repo stays private.
- Budget: one run is usually 3–5 scouts, 3–5 validators, 1 librarian, 1 importer. More than 10 agents in a run needs
  the author's yes.

## Common mistakes

| Mistake | Instead |
|---|---|
| The orchestrator searches itself and fills its context with result pages | Scouts search; the orchestrator reads cards |
| A validator "validates" by trusting the card | It checks the id against OpenAlex/Crossref/arXiv and the abstract |
| Questions as open text | Multiple choice, one "(Recomendado)" |
| Importers in parallel | One importer, papers one after another |
| The report hides what the search could not reach | A limits section, with counts and failures |
