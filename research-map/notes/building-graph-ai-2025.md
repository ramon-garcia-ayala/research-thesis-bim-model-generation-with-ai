## 2026-11-08 · Summary
Liang, Zhong, Zhao, Fricker and Koh (post-print, IJAC 2025). A Revit Dynamo script turns a building into a graph: wall
endpoints and columns are nodes, walls are edges, and the edge attribute is the wall type. A variational graph
autoencoder (VGAE) learns to predict the wall class of each edge. To generate, the building volume is divided by a 3D
grid, the interior walls are masked, and the VGAE predicts them from the outline and the main entrance. The predicted
edge classes are rebuilt in Revit as layered components. The data are HouseGAN 2D plans (27,965 after filtering),
turned into 3D Revit models by the authors.

Results
- Three node and edge encodings, compared by reconstruction loss. Method 3 (spatial plus context information) is best,
  0.098 with TransformerConv, against 0.184 for method 1 and 0.412 for method 2 (Fig. 5). Method 2 with GINEConv: 0.756.
- Generation with the interior masked: SAGEConv is the best encoder, loss 0.45 on 27,965 plans (0.60 on 3785, Fig. 9).
- Validity is measured only as room accessibility, with rooms that have no way in marked inaccessible. Examples give 75%,
  100%, 45% (an enclosed room without a door) and above 80%: a few layouts, not a rate over a test set.
- Generated components can be swapped by type, for example exterior walls to glass curtain walls (Fig. 10).

For the thesis
- A close case for the Revit side of the question: Revit to graph and back to Revit elements, with masked interior walls
  as the training task. Hornung and Renner work from IFC and stop at bounding boxes in Rhino.
- The parts are fixed in advance: a grid of possible walls with six edge classes. The model labels edges and never
  creates a node, as the authors say. It fills in a layout; it does not learn a decomposition.
- The data are not real BIM models: 2D plans from one Japanese real-estate service, extruded to walls on a 1 m grid,
  orthogonal only. The authors list isolated windows, doors and furniture as missing.
- No IFC, no code rules, no check that the Revit file is correct. The paper does not say how the test set is split, or
  whether one plan can appear on both sides.

Doubts from reading it (Claude's, not the paper's)
- The text says one layout drops to 45% accessibility, but Fig. 9(b)(2) prints 40%.
- The abstract says it excels over voxel, point cloud and 3D field methods, yet no experiment compares them. Only encoders
  inside the same VGAE are compared.
- Related work gives about 117,000 HouseGAN plans, the methods 27,965, and the 3785 set of Fig. 9 is never explained.
