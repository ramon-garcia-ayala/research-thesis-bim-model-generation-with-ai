## 2026-11-08 · Summary
Builds a benchmark of single IFC elements and tests whether a network can name an element's IFC class from its shape alone.
Around 1000 IFC models (real projects, student works, online sources, mostly from Revit and ArchiCAD) were decomposed into
individual entities, one file each, with their property sets: roughly 1.2M entities from 82 IFC classes. Deduplication by
geometry cut this to around 290k. Domain experts then reviewed entities by hand in a web tool and corrected misclassified
ones. The full dataset has 19,613 confirmed objects in 65 classes. A 20-class subset, IFCNetCore, has 7,930 objects
(5,551 for training, 2,379 for test).

Results
- Three networks, geometry only, test set: MVCNN (12 rendered views) 85.54% balanced accuracy and 86.93% F1; MeshNet 83.32%
  and 85.72%; DGCNN (2048 points) 79.11% and 82.15%.
- Most confused classes: plates, slabs and walls; duct segments and pipe segments. Classes with few objects, such as
  IfcOutlet, do worse.
- Limits stated by the authors: object size is lost by normalization; near-duplicates that are not identical on the mesh
  level remain; metadata is multilingual, sometimes empty or wrong, and was not used.

For the thesis
- A decomposition of real IFC models into elements at a scale of about 1.2M entities, with the cut, the deduplication and
  the label review described. It is the element-level counterpart of the deconstruction in Hornung et al. (2025).
- Its relabeling method is manual review by experts in a web tool, not an algorithm. It shows that the IFC class
  in real files cannot be trusted as a label: elements move between classes during review (for example out of
  IfcBuildingElementProxy).
- Elements are cut out alone: no relations, no position in the model. The authors say some objects are hard to classify
  without the context of the full model. For the question this is the opposite of a graph: parts without the whole.
- Not shown: it generates nothing, writes no IFC or Revit, and measures no validity. The task is classification only.
- Not stated: how many of the ~1000 models end up in IFCNetCore, and whether the train/test split is by project. If it is
  by object, the same building can be on both sides.

Doubts from reading it (Claude's, not the paper's)
- The authors admit near-duplicates cannot be removed, so test objects may resemble training ones. The scores may be
  optimistic.
- Table 1 says not all objects "after deduplication" have been reviewed yet, so the 19,613 confirmed objects are a work in
  progress, and no agreement between reviewers is reported.
