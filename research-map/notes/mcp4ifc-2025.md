## 2026-11-08 · Summary
An open-source MCP server that lets an LLM (Claude Sonnet 4.5, GPT-5 mini) read, create and edit IFC through more than 50
tool calls on IfcOpenShell, with Blender and Bonsai only as the viewer. It has predefined tools (walls, slabs, roofs, doors,
windows, stairs), scene queries, and a tool that runs Python the LLM writes, helped by a RAG store. Nothing is trained.
The authors call the tests a proof of concept, not a benchmark.

Results
- Querying: 65 questions on the Duplex ARC and MEP models, checked by hand. GPT-5 mini 83.1%, Sonnet 4.5 75.4%. Indirect
  questions are the weak spot, 43.8% for both. The 80% for Sonnet 3.5 is on the whole dataset, so not comparable.
- Editing: eight semantic edits (rename, property sets, Uniclass, cost) on one file, BasicHouse.ifc. Sonnet 4.5 did all
  eight, checked by comparing the IFC before and after.
- Generation: six buildings from single prompts and an L-shaped house in six steps, with no score. Reading the IFC, the
  authors found walls not connected at intersections, no openings for doors and windows, no IfcSpace for rooms, and
  elements without property sets, materials or spatial containment.
- Appendix: floor-plan images turned into walls lost fine geometry; 40 screenshot questions scored 73%.

For the thesis
- The clearest account here of what breaks when IFC is written without training: the geometry looks right, the semantics
  and relations are missing. The authors end by asking for models trained on well-structured IFC data.
- It tests nothing the hypothesis needs: no training, no decomposition into parts. It builds from instructions, one
  element at a time.
- It writes real IFC, not through the Revit API. No validity is measured: no IDS or schema check, and no count of what
  is missing.
- Real models: one for editing, one for querying. No split by project.

Doubts from reading it (Claude's, not the paper's)
- The text says GPT-5 mini solved 26 direct questions; Table 2 gives 25 correct for that category.
- Ambiguous answers were marked correct, so the authors call the accuracies an upper bound. The 83.1% to 75.4% gap is five
  questions, and no repeated runs are reported.
- "Valid IFC geometry" rests on looking at the result. No validator is named.
