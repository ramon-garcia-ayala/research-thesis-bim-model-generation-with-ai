## 2026-11-08 · Summary
An audit of what real IFC files contain. The authors inspect 57 IFC models from practice (buildings, a roundabout, a
metro station), given in kind by designers from research projects in the Netherlands, Spain, France, Sweden and Italy.
They check by hand, with text editors, IFC viewers and the NIST IFC analyzer, and score each model from 0 to 1 against
the IFC schema. The minimum to allow automatic processing is set at 0.6. The aim is interoperability and automation,
not learning.

Results
- Software and version: most models are IFC 2x3 (CoordinationView 2.0), mostly exported from Autodesk Revit.
- Georeferencing: in 24 of 57 models the planar coordinates are completely wrong, often a default location in the US
  close to Boston; in 7 they are a random point in the country; only 9 are accurate enough to use.
- Semantics: only models 3a, 3b, 7b and 8b score above 0.6 on entities, IfcBuildingElementProxy, materials and
  attributes at once. Materials are filled in 33 of 57 models and very inaccurate in 11. In one model a slab is stored
  as IfcWall.
- Grouping: IfcSite holds every object in 45 of 57 models. IfcBuildingStorey grouping is good in only 4 of 50 models.
- Spaces (30 architectural models): 20% well used, 27% approximated, 27% not used, 13% displaced, 10% redundant.
- Geometry: intersections are visible in at least 23 models. IfcOpening is well used in 27 of 39.
- For every use case (costs, structure, energy, permits, conversion), no more than 5 to 10 of 57 models could be used
  as they are.

For the thesis
- It is a direct measure of the raw material. A decomposition that trusts IFC classes or the Site/Storey/Space hierarchy
  will inherit these errors, so cleaning and per-model checks come before training.
- Not shown: no learning, no generation, and nothing written to IFC or Revit. Validity is a manual score, not a checker.
- The sample is 57 files from research partners, with many files from the same project (n. 16 to 27 are one project).
  It does not say how common the errors are across the industry.
- Most files come from Revit, but they are IFC exports. Whether the same faults exist in the native Revit model, which is
  the author's data, is not tested. The paper links several patterns to the software's default export settings.

Doubts from reading it (Claude's, not the paper's)
- The count of installation models is 11 in the methodology and 13 in the conclusions.
- IfcSpaceBoundaries are in 13 of 30 models in Section 4.3.2 and in 12 cases in Section 5.5.2.
- The georeferencing counts (24, 7, 2, 9 and 1 with no information) seem to add up to 43 of 57. The paper does not say
  what the other 14 models are.
- Table A1 gives 12 models (n. 16 to 27) for the Amsterdam project, but the text says 11 for WoonConnect.
