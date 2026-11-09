## 2026-11-08 · Summary
The graph recipe of Hornung et al. (2025, §3.2), step by step:
- Nodes: IfcObject instances of six classes (storey, space, slab, wall, column, beam), chosen as enough for a simple
  building.
- Edges: directed subject-predicate-object triplets, from IFC containment or aggregation metadata and bounding-box
  overlap (Table 1). The schema is custom, inspired by the BOT ontology.
- Node features: the type as a one-hot vector and the geometry as a minimal oriented bounding box, because doors,
  windows and openings produce irregular polygons. That gave 15 dimensions.
- Reduction: 15 dimensions produced overly abstract geometries, so each element is assumed upright and free to rotate
  only around Z, which removes the redundant orientation values.
- Tools: IfcOpenShell for IFC, Open3D for the boxes, NetworkX for the graphs, DGL and PyTorch for training.

For the thesis
- A worked answer to the first half of the question: what "decompose into meaningful parts" can mean in practice.
- What it gives up: custom parameters, openings as such, and every class outside the six. The authors say these
  simplifications can lose spatial and relational details.
- Open (Claude's reading, not in the paper): its input is IFC, while the thesis works from Revit data lakes. The same
  recipe needs a Revit-side equivalent, or an export to IFC, and that choice has to be tested.
