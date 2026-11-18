# Experiments

Preliminary experiments on the one model we have (Autodesk's sample, `pipeline/out/source.json`): smoke tests of each
step, not results about learning. Scripts in `pipeline/experiments/`; each run writes `<id>/summary.json`.

| Id | Status | What it shows |
|---|---|---|
| `e1-tokens-bfs` | done | The 394 elements (5 levels apart) become tokens (6–9 each, 403-token vocabulary at 0.5 m bins) and a graph of 1,238 edges; BFS cuts 394 subgraphs of up to 20 nodes (286 distinct, 228 with a door or window). |
