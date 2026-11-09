## 2026-10-22 · Summary
A framework on AI2-THOR that builds houses from a hand-written room spec ("1 bedroom connected to 1 bathroom…"):
sample a boundary, subdivide it into rooms (constrained growth), connect them, place objects by soft rules, then
materials and lighting. A validator (BFS on a 0.25 m grid, at least 5 reachable cells per room) rejects a house and
resamples it from the same spec. Houses are stored as JSON. ProcTHOR-10K: 10,000 houses from 16 specs, generated in
about 1 hour on 4 GPUs.

Results: simple RGB agents trained only on ProcTHOR reach SoTA on 6 benchmarks, 3 of them zero-shot (ArchitecTHOR
ObjectNav 18.5% → 31.4%). Scale ablation (10 → 10,000 houses): test performance rises with synthetic scale.
Single floor only; the houses are never judged for architectural realism, only by how agents perform.

For the thesis
- The clearest existing proof that rule-generated data, checked by a validator, trains models that transfer to
  real scenes, though for robotics, not architecture.
- The pipeline (spec → generate → validate → resample → JSON) mirrors GFit's engine; the validator is the analogue
  of its checks / issues list.
- The "label" is a task for an agent, not design quality: the layout distribution is whatever the 16 specs encode.
