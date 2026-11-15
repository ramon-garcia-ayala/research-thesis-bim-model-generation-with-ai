## 2026-11-15 · Summary
Zhang, Savov and Dillenburger (ETH Zurich, Automation in Construction 190, 107120, 2026, CC BY 4.0; read from the ETH
Research Collection copy). MaskLayout generates single-apartment floor plans with irregular room polygons inside
non-rectangular site boundaries. A layout is a graph of up to 14 rooms, each with six attributes: type, centre, size,
adjacency, windows and region (polygon). Training hides parts of that graph with dynamic masking on two levels: graph
level (a whole room, all its attributes) and node level (one attribute of one room), on a Gaussian schedule, because a
fixed ratio such as BERT's 15% or MAE's 75% does not fit inputs that vary with what the user gives (§3.4.2). A
bi-directional transformer (MaskGIT style) predicts all masked tokens at once and decodes iteratively, room by room by
confidence. Rooms are carried in two modalities, vector and image, fused by cross-attention, and a post-processing step
aligns the vector polygons with the image. The data are more than 43,000 apartments parsed from SwissDwellings, split
80/10/10; all results are on held-out sites and plans (§4).

Results
- Ablation on decoding order (Table 2, FID on images, lower is better): the full model 4.02; an autoregressive
  transformer instead of the bi-directional one 4.84; selecting tokens evenly by confidence, as MaskGIT does, instead
  of node by node 4.67; a linear mask schedule instead of Gaussian 4.30.
- Without the partial-input attention mask the FID rises to 10.26; without the adjacent-flat context, 6.36 (Table 2).
- FID grows with room count, from 2.78 at 3 rooms to 5.06 at 13 and 4.85 at 14, 500 layouts per count (Table 4).
- Validity is measured with its own metrics: boundary fit, overlap between rooms, circulation accessibility (required
  neighbours per room type, from the generated geometry, not from the adjacency attribute) and room-shape compactness
  (Table 3, values not copied here).
- Failure cases (Fig. 12): rooms without access, rooms drifting from the requested place, missing kitchen or bathroom
  under sparse input, area mismatch, post-processing artefacts. Three architects reviewed an iterative design session.
- The authors limit "ready for BIM/CAD" to closed room polygons that can be imported as a scaffold; walls, openings and
  construction elements are future work (§6).

For the thesis
- The closest architecture paper to masking-training found so far: it hides whole rooms or single attributes and
  learns to complete from whatever remains, which is the two-level choice of what to hide (element vs property).
- Table 2 is direct evidence for placement-order-experiments: on the same model and data, bi-directional decoding of
  all masked parts with iterative refinement beats autoregressive one-by-one (4.02 vs 4.84 FID), and the order in which
  rooms are fixed during decoding matters (4.67 when chosen evenly by confidence). It does not test "one and then its
  neighbours".
- It works on rooms of a plan, not on Revit elements, and writes no model back; validity is geometric and functional,
  checked with its own rules. Novelty against the training set is not measured, so new-not-replicated stays open.
- Lead: MaskPLAN, its reference [17], by the same group, formulates plan synthesis as masked completion over
  heterogeneous attributes; worth a search of its own.
