## 2026-11-08 · Summary
Classifies Revit elements into 10 categories (Walls, Doors, Windows, Furniture...) and asks whether the neighbours of an
element help. Data: 42,874 elements from Revit files of local architects, one building per architect, read through Rhino
Inside Revit and Grasshopper into JSON. Each element has seven bounding-box properties (70 binned features). Two
elements are linked when their bounding boxes intersect. Classic models (logistic regression, random forest, SVM,
k-nearest, MLP) see one element alone. Graph networks (GraphConv, SAGEConv, TransformerConv) see the whole graph, or
only the first-order neighbourhood of each element (subgraphs), or that neighbourhood with the neighbours' categories.

Results
- Train and validation come from the same files and reach over 99% and 98% for the best method. On a file left out of
  training, all models fall to 81%-90%. Test accuracy varies by over 5% depending on which file is left out.
- Table 3, one example run: k-nearest 0.956 train and 0.778 test; best subgraph model with categories 0.998 and 0.921.
- Averaged over five test files: SVM 86.7% (best classic), best node-classification GNN 87.7%, subgraph models 88.3%,
  subgraphs with neighbour categories 89.9% (GraphConv).
- In one 4,442-element building, the SVM labelled 133 windows as doors (similar size). The graph models confuse windows
  with plumbing fixtures: both touch walls.

For the thesis
- The measured gap between files: 98-99% inside the files seen, 81%-90% on a new file. It supports splitting by file
  (here by project) from the start. A random split of elements would report the first number.
- The authors say real files from different offices carry different modelling conventions. They suggest this may
  explain the gap.
- Relations help, by 1 to 3 points over the best classic model on unseen files. The gain is small next to the gap above.
- Not shown: it generates nothing, writes no IFC or Revit, and measures no validity. It classifies existing elements.
- Small and closed: 10 or 11 files, one country, one tool (Revit), data not public, no repeated runs or
  confidence bounds.

Doubts from reading it (Claude's, not the paper's)
- The size of the data is not consistent: the introduction says over 35,000 elements from 11 files, the methods say over
  42,000 from eleven files, then 10 Revit files; the split uses ten files, five of them as test.
- The 89.9% gives the model the true categories of the neighbours. In use, those would be predictions, and errors would
  carry over. The paper does not test this.
- The gain of the node-classification GNN over the SVM is 1 point (87.7% against 86.7%), inside the 5% spread between
  test files. Per-file results of each model are not given.
- The introduction says transformer layers gave the best results; the 89.9% in the results is GraphConv.
