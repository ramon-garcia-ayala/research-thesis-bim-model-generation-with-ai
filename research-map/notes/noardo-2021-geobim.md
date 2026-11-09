## 2026-11-08 · Summary
A benchmark of how software reads and writes IFC. Volunteers test their own tools on three real IFC building models, all
made in Revit (Myran, IFC2x3, 27.14 MB; UpTown, IFC2x3, 241.04 MB; Savigliano, IFC4, 21.55 MB), and on synthetic geometries
made with IfcOpenShell. They report what loads, what is lost and how long it takes, and send back the IFC each tool
exports. The authors count entities in the exports with the NIST IFC analyser and inspect them by eye. Reports and exported
files are public on Zenodo. Part II covers CityGML.

Results
- Reading: only 30% of the tools use the georeferencing correctly; about 80% handle semantics in a satisfactory way.
- Writing, Myran: only ACCA Primus and ACCA usBIM.viewer return the same number of each feature. The only entities
  unchanged in all exports are IfcUnitAssignment and IfcBuilding. File size goes from 27 MB up to 94 MB (Revit).
- Writing, Savigliano: only BIMServer returns the model unchanged. Bricscad loses 718 IfcWalls and gains 718
  IfcWallStandardCases.
- Synthetic geometries: few tools re-export them unchanged (ACCA Primus, ACCA usBIM.viewer, ArchiCAD). Parametric solids
  such as IfcRevolvedAreaSolid and IfcSweptDiskSolid are lost; IfcCartesianPoint, IfcFace and IfcPolyLoop grow.
- 43 reports for 33 packages. Myran opened for 40 participants, Savigliano for 25, UpTown for 20.
- The authors find no common pattern in what is kept, lost or added.

For the thesis
- The best public evidence that IFC is not a stable layer: one model comes out different from each tool (storeys merged,
  elements split, parametric geometry turned into explicit faces). Any decomposition should record the exporter.
- Possible use (Claude's reading, not in the paper): the exported files are one building seen through many exporters.
- Not shown: no learning, no generation, nothing written to IFC by a model. Validity is entity counts and visual checks,
  not a schema checker. Three real buildings, no split by project, and UpTown exports were not analysed.
- Answers are self-reported by volunteers of mixed expertise; the authors say they were generally not changed.

Doubts from reading it (Claude's, not the paper's)
- Section 4.1 says 31 software packages were tested; Section 4.7 and the Discussion say 33. The paper does not explain it.
- "Data loading times of less than a minute were also dominant (65% in total)" appears word for word for Myran and for
  Savigliano. A copy error is likely.
