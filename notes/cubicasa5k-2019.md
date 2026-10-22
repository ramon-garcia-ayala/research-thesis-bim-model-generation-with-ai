## 2026-10-22 · Summary
Aalto / CubiCasa. 5,000 raster plans (mostly Finland), a by-product of CubiCasa's partly manual vectorization
service, annotated as SVG polygons in over 80 categories; each image took "from 5 to 120 minutes", then two-stage
QA. The model: a ResNet-152 hourglass with room and icon segmentation plus 21 heatmaps (wall junctions, corners,
openings), and a heuristic post-processor that rebuilds polygons.

Results: rooms mean IoU 57.5, icons 55.7; after polygonization 49.3 and 41.6, because missed junctions break the
polygons. Experiments use 12 room and 11 icon classes, not the full 80+. No limitations section; raster input only,
and annotation cost grows linearly with images.

For the thesis
- A clean, citable number for the cost of the manual route: 5–120 minutes per plan.
- Much of the ML effort goes into recovering structure that rasterizing destroyed; a rule engine never loses it.
- A baseline more than an argument.
