## 2026-11-15 · Summary
Only the abstract was read (OpenAlex, 2026-11-15); the thesis itself was not. Shoaip (2026), "Exploring link prediction on
multidisciplinary BIM graphs using graph neural networks", Technical University of Munich. The problem is that
architectural and structural models from different disciplines are linked in a cloud BIM setup, and cross-disciplinary
links such as host or corresponds_to are often missing or only implied, while links inside one discipline are usually
clear. The work builds a hybrid of a rule-based method and graph neural networks for link prediction. A custom pipeline
extracts geometry from IFC files, generates candidate element pairs, and labels them by hand with a custom Revit-based
tool. GCN, GraphSAGE, GAT and GIN are compared against the rule-based baseline with precision, recall, F1-score and
confusion matrices, on seen and on previously unseen projects.

Where the PDF is: mediaTUM, https://mediatum.ub.tum.de/1841525 (OpenAlex lists
https://mediatum.ub.tum.de/doc/1841525/document.pdf). The repository answers scripts with a bot check, so open it in the
browser. The abstract does not say what level of thesis it is.

Results
- The abstract gives no numbers. It says the rule-based method works well when the geometry is clean and the case is
  easy to state as rules, and that as cases get more ambiguous the learned models handle them better and generalize more
  consistently across projects.

For the thesis
- It predicts missing links from the rest of the graph: edge completion rather than masking. It is the nearest thing to
  hiding part of a BIM graph and predicting it back on IFC elements, linked to masking-training for that reason, but the
  links it predicts are ones that were never in the model, not links hidden on purpose to train.
- Its comparison on seen and unseen projects bears on the point that a score on a model's own projects is not transfer
  (accuracy-on-own-models), though the abstract does not give the split or the numbers.
- Candidate pairs generated from geometry and labelled by hand in Revit is a labelling route the thesis does not need if
  the labels come from the model itself, as in masking.
- Do not cite any figure from it until the PDF is read.
