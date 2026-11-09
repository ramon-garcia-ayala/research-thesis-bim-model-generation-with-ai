## 2026-11-08 · Summary
A two-page conference paper from the MCP4IFC group. An LLM builds an IFC model from a prompt and checks its own work.
A Specifier turns the prompt into an IDS file and a looser "non-IDS" specification (geometry, topology, complex
relations). A Modifier writes and revises the IFC. A Verifier runs ifctester on the IDS and writes its own code for the
rest. The report goes back to the Modifier until all passes or an iteration limit is reached. Tested on one prompt ("a
simple but realistic house, 4 rooms per level, 2 levels, made out of wood", gable roof), GPT-5.2, five iterations.

Results
- One case, no table of numbers. Figure 2 shows five requirements at iterations 1, 3 and 5: 8 IFC Spaces, Gable Roof,
  Timber Walls/Slaps, Incomplete Envelope, Storeys contain Spaces.
- Iteration 1 fails all five. Iteration 3 passes the first three. Iteration 5 shows a more complete envelope, but
  "Storeys contain Spaces" still fails: the eight IFCSpace entities are not related to their IFCBuildingStorey.
- Also reported: trouble deleting existing elements; errors in the specification step reach every later check.

For the thesis
- The closest template for a validation loop with IDS: an IDS per request, run by an open checker (ifctester), with
  the report fed back. It shows a way to measure validity on a generated IFC, which Hornung and Renner leave open.
- It writes IFC (MCP4IFC, ifcopenshell-python), but an LLM builds it from text. It learns nothing from existing models.
- Not evidence of validity: one prompt, one run, no real models, no split by project, no run without the loop.
  The authors call it a proof of concept.

Doubts from reading it (Claude's, not the paper's)
- The abstract claims "improvements in model quality", but the requirements were written by the same LLM pipeline and
  nothing independent checks the final model. Iteration 5 is the last cycle and still fails one of five.
- A listed contribution is a Text-to-IDS module "that turns natural-language requirements into valid IDS constraints".
  Nothing measures it; the conclusion proposes a Text-to-IDS benchmark as future work.
