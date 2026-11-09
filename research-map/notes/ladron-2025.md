## 2026-11-08 · Summary
Encodes each room of a BIM scene as a sequence of tokens that unify walls, openings and entities in wall-referenced
coordinates, and trains one Transformer for two tasks: room embeddings for retrieval, and placing entities one by one.
The data are residential rooms extracted from professional BIM projects of single-family homes.

Results: on a same-data benchmark its entity prediction outperforms the ATISS and BLT baselines bridged into its
representation.

For the thesis
- A partial counterexample to the gap: learned generation from professional BIM, inside a fixed room envelope.
- It works at room scale and places contents. It does not generate a whole building or write a validated BIM model.
- Its wall-referenced tokens are a concrete idea for how to write a model as text. Comes from a company, Higharc.
