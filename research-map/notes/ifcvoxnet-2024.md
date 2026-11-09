## 2026-11-08 · Summary
Turns IFC models into labelled voxel grids and trains a 3D U-Net to give every voxel an IFC class (slab, wall, beam, window,
door, column, railing, stair, furnishing). The grid ignores how the modeler split the building into elements. Patches of
64 × 64 × 64 voxels are cut around each element's bounding-box centre; each patch shows the element with its neighbours. The
network is trained on 8 public IFC files and tested on 2 files it has not seen. It starts from the problem of wrongly
classified elements and aims to check or enrich IFC models.

Results
- Training: 47 epochs, batch size 8, Adam, cross-entropy loss. Table 1 counts per class: 3,441 walls and 682 slabs in
  training, 2,068 railings and 564 stair flights in the test files (49 stair flights in training).
- Element-wise, Molio (Table 2): 98 of 98 walls, 119 of 119 doors, 2,066 of 2,066 railings, 553 of 564 stair flights, 7 of 7
  beams, 3 of 14 columns (11 called walls), 9 of 38 furnishing elements (25 called walls). Of 119 windows, 106 are right,
  11 became doors and 2 walls.
- FZK Haus (Table 3): 13 of 13 walls, 11 of 11 windows, 5 of 5 doors; 0 of 4 beams (3 called walls); 2 of 4 slabs.
- Per voxel, Molio (Table 4): wall 0.9566, window 0.9541, door 0.8560, railing 0.9868, slab 0.6092, beam 0.0051.
- The authors do not report IoU, because it "could be fairly low" for some classes. The failures shown are a window frame
  predicted larger, a podium staircase read as a wall, and a stair landing read as part of the slab.

For the thesis
- It is the clearest statement in the set that there is no standard way to cut a building into elements (Figures 2 and 3):
  the same wall can be one element or several, and a wall can sit in the IFC as a column, a railing or a beam. Whatever
  the thesis decomposes into must pick one of these cuts.
- Its answer is to avoid the cut: voxels do not care about the cut. That is the opposite of the thesis, which needs parts
  that mean something. It is a counter-argument and a baseline for "meaningful", not a method to copy.
- It shows that the IFC class in real files is not a reliable label (Figure 2), the same point as IFCNet. Here the label
  is still the IFC class itself, and the authors say they have no curated ground truth.
- The split is by file (2 unseen models), the check that the Renner et al. note finds missing there.
- Not shown: it generates nothing, writes no IFC or Revit, and measures no validity. It reads IFC only. Eight training
  files is a small base, and all are public models.

Doubts from reading it (Claude's, not the paper's)
- Table 4 has all zeros in the Column and Stair rows, while Table 2 shows 3 columns and 553 stair flights found. The paper
  does not explain it. The row may be empty because of how the matrix was made, or the two tables measure different things.
- The test set is mostly railings and stair flights: Molio alone has 2,066 railings and 564 stair flights, against 49 stair
  flights in all of training (Table 1). The element-wise result says mostly how well it names those two, which the
  authors say come from every bar and riser being modelled alone.
- It compares nothing with earlier work, though the Evaluation says the element-wise matrix is "useful for comparing our
  outcomes to the state of the art".
