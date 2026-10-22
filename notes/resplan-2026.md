## 2026-10-22 · Summary
Indiana University, preprint. Listing images from South Asian real-estate sites, turned into vectors: color
segmentation and OCR, contour tracing into rooms, walls, doors and windows (listed area anchors the scale), repair,
then automated checks. Each plan is Shapely polygons plus a NetworkX graph with 4 edge types. About 27,000 plans in,
17,000 kept (37% rejected); 83.1% of room polygons plausible in a 500-plan audit. CC BY 4.0 with a takedown policy;
collection and OCR scripts not released.

Results: room labeling GraphSAGE 95.1%; cross-dataset gaps against RPLAN and MSD up to 70.6 pp ("the gap is
structural"). Generation: CVAEs keep room counts but adjacency 0.68, falling to 0.42 at 13+ rooms; DDPM FID 6.1,
but "pixel generation thus gives visual fidelity without structural guarantees". 6.9% near-duplicates.

For the thesis
- Documents every cost of the scraped route: rejection, OCR and vectorization noise, near-duplicates, legal
  workarounds, regional bias, no transfer.
- Its schema (polygons + typed graph + metric scale) is close to an information model.
- Rules (geometric checks, graph construction) already do much of the labeling; a rule engine gives the structural
  guarantees by construction (inference).
