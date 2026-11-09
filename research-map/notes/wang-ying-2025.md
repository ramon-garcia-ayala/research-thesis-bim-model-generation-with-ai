## 2026-11-08 · Summary
Embeds each IFC object as one vector with its modalities kept apart, then lets its neighbours refine it. Attribute text goes
through OpenAI's text-embedding-3-small (cut from 1,536 to 1,000 values). Geometry is 1,024 sampled points plus centre and
scale (3,076 values). The two are concatenated (4,076 values) and passed through a three-layer GraphSAGE over four edge
types: belonging, host, touch, intersect. The test is classifying objects into 15 IFC classes on five IFC models (Revit and
ArchiCAD) with 21,083 nodes and 137,381 edges, split at random 60/20/20 within each graph.

Results
- Attributes with all edges: 97.7% accuracy, F1 0.97. Attributes plus geometry: 86.6%, 0.83. Geometry alone: 58.8%, 0.57.
- Edges only, no node features: 57.9% with all types, 47.6% with belonging alone.
- Same embeddings, other classifiers: random forest 98.4% on attributes against 97.7% for GraphSAGE.

For the thesis
- A concrete IFC-to-graph channel where text, shape and relations stay separate, as a decomposition model would need as
  input. It does classification only: no IFC or Revit is written, no validity is measured, nothing is generated.
- Its geometry embedding (raw point coordinates) hurts: 97.7% falls to 86.6% when added. The authors plan PointNet or
  MeshNet. The thesis should not copy this geometry step.
- It does not show that the graph helps: no run compares the same node features with and without edges.
- Five models, one with 15,676 of the 21,083 nodes, and no split by project: objects of one model sit in both training
  and test. The authors call the task too simple.
- In one residential model they relabeled 566 objects by eye (walls modeled as columns, among others): the dirty-data
  problem of Hornung et al., met in practice.

Doubts from reading it (Claude's, not the paper's)
- Their attribute dictionary example includes `<ClassName: value>`. If the class name stayed in the text, the 97.7% may come
  from the label itself. The paper does not say what was removed.
- It does not say whether the other classifiers see the edges, so "close but not beyond" is hard to read.
