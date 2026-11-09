## 2026-10-18 · Summary
Pacific Northwest National Laboratory, preprint (not peer reviewed). Data comes from gbXML (parsed with lxml,
the LLM turns questions into tool calls) and from PDF specs (LLM, OCR). Two checking routes:
(i) an agent fills the inputs of the COMcheck API (DOE's deterministic energy-code engine), JSON out;
(ii) RAG over the code text, where the LLM decides compliance itself.

Results: one question (lighting allowance, 500 m² bank). Models alone or with RAG gave about 5,400–7,500 W,
one used the wrong table, Claude Sonnet 4 with RAG did not calculate; through COMcheck the answer was the same
every time (3,019 W). Speed benchmark only (GPT-4o fastest, ~3.7 s); o3-mini failed. Evaluation is one
surface and one question; no accuracy figure for extraction.

For the thesis
- The tool the agent calls does the work: RAG is "not yet dependable for regulatory implementation" (p.13).
- RAG for "early-stage 'what-if' analysis"; the engine "guarantees rigor and reproducibility… suitable for
  certification, documentation, and enforcement" (p.13): concept stage vs construction documents.
- Most of the paper is extraction: missing or implicit BIM metadata is a core barrier (p.5, p.15); real inputs
  are "incomplete, inconsistent, or even scanned documentation" (p.15).
- COMcheck "can only check what COMcheck has encoded" (p.13): the engine's reach is the limit.
- Silent on who signs and on liability.
