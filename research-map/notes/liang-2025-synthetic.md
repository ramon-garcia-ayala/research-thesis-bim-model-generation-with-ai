## 2026-11-08 · Summary
A pipeline that makes Revit models in bulk. A program draws random polygon boundaries; two CNNs trained on RPLAN (over 80,000
residential floor plan images) fill each boundary with rooms and walls as a raster; image processing turns it into a
four-channel image (geometry, room semantics, height, material); a C# library inside Revit 2024 then places walls, doors and
windows through the Revit API, with family types from a local library. The output, ResBIM, is RVT models paired with
annotated 2D floor plans, offered as a reference set for 2D-to-BIM methods.

Results
- Room centroids: mean absolute error about 5.2 pixels, room type accuracy 99 %. Walls: Dice about 0.52.
- 1100 boundaries gave 1100 floor plans; 1027 became Revit models without a warning window (93.4 %), in about four hours.
  The 73 failures: dimensional errors, too many wall pixels or too few.
- One pixel is 70 mm. Wall height is a random value between 2.8 and 3 m; the family type is a random pick among those that
  pass the Revit filter.

For the thesis
- A concrete route for writing into Revit from a family library: filter family symbols, pick one, call NewFamilyInstance at a
  point, set orientation. Lines make walls, closed curves are extruded. It is C# inside Revit, not IFC.
- It is not decomposition. The layout comes from a CNN trained on raster images, and the pixel-value-to-element dictionary is
  written by hand. No Revit or IFC model is taken apart to teach anything.
- Validity is only Revit's own warnings (wall continuity, host walls, collisions). No rule check, no comparison with real models.
- Not shown: IFC export is claimed ("can be exported seamlessly") but not done; no 2D-to-BIM method is tested on ResBIM; only
  straight walls, no stairs, MEP or façades, and a living room in every plan because RPLAN has one.

Doubts from reading it (Claude's, not the paper's)
- The title says "fully automated", but §4.3 says height and material channels "are completed manually", while §3.3.2 describes
  random draws. The paper does not say which produced the 1027 models.
- 99 % accuracy around walls beside a Dice of 0.52, and a denoising step that is not described: layout quality is judged
  by figures, not measured. And 5.2 pixels at 70 mm is about 36 cm (our arithmetic); the paper does not convert it.
