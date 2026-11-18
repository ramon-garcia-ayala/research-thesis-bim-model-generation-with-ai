# Experiments

Preliminary experiments on the one model we have (Autodesk's sample, `pipeline/out/source.json`): smoke tests of each
step, not results about learning. Scripts in `pipeline/experiments/`; each run writes `<id>/summary.json`.

| Id | Status | What it shows |
|---|---|---|
| `e1-tokens-bfs` | done | The 394 elements (5 levels apart) become tokens (6–9 each, 403-token vocabulary at 0.5 m bins) and a graph of 1,238 edges; BFS cuts 394 subgraphs of up to 20 nodes (286 distinct, 228 with a door or window). |
| `e2-mask-openings` | done | One door or window hidden per subgraph, three folds by storey, a small graph transformer (~127k parameters): on the 107 elements, class 100%, type 79.4% and host wall 61.7%, against 58.9% / 29.9% for frequency and 57.9% / 32.7% for copying another floor. The place along the wall is not learned (median 3.36 m with the right host, as the middle of the wall, 3.23 m); none within 1 cm. |
| `e3-mcp-place` | failed | The MCP server for Revit (Demolinator, 48 tools) answers a Python client, and the 214 placements are ready, but none reached Revit: pyRevit 6.5.5 on Revit 2027 never ran the extension's startup (no route registered) and Revit closed twice on a Routes worker-thread error. rebuild.py (no AI) stays the only placement: 107/107. |
