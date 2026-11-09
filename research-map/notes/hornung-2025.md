## 2026-11-08 · Summary
Builds a heterogeneous graph dataset from real IFC files and trains a network to generate buildings one element at a
time. Of 148 offices contacted in Germany and Austria, 24 gave substantive feedback, yielding 50 IFC files; 22 remained
usable. The other 28 lacked a required class or failed through corruption or parsing errors. It keeps six classes
(storey, space, slab, wall, column, beam) with oriented bounding boxes. Rotation and mirroring give about 109 buildings,
cut into over 600,000 subgraphs of 20 nodes, then deconstructed into over 1.8 million pairs of partial graph and removed
node; 180,000 of them are balanced samples.

Results: about 79% accuracy predicting the node type (precision 68.9% for slabs to 91.2% for storeys).

For the thesis
- The closest existing work, and the direct point of comparison for the method.
- It stops at class and bounding box shown as geometry: no IFC is written and no validity is measured. That is the gap.
- The 56% of files lost shows the raw material problem, though its strict six-class filter causes part of that loss.
- Do not read "180,000" as independent examples: they come from 22 files, and Renner et al. flag possible leakage.
