## 2026-11-08 · Summary
How Hornung et al. (2025, §4) put a building back together: one predicted element at a time, from the partial graph.
- A classification network predicts the type of the next node: about 79% accuracy after 20 epochs, about 80 hours, on
  IFC_hBFS_180k. Precision goes from 68.9% for slabs to 91.2% for storeys.
- A regression network predicts its features: an average distance of about 15 m with known coordinates and about 22 m
  without. The authors call 22 m conventionally poor, yet visual inspection showed correct spatial relationships.
- In use (Hops, Rhino/Grasshopper): the components become a graph, the networks propose the next one and it returns as
  geometry. The user accepts, rejects or adjusts it, the graph updates, and the next prediction runs.

For the thesis
- The second half of the question, and also the gap: it stops at a bounding box shown in Rhino. It writes no IFC or Revit
  element, measures no validity, and leaves the termination probability out, so the user decides when it ends.
- Support for the hypothesis with a limit: element-and-relation graphs do teach the type of the next element, but not
  yet its exact place and size.
- The accept, reject or adjust loop could produce proposed-versus-kept signals. The paper does not record them.
