## 2026-11-08 · Summary
The same group and data as Hornung et al. (2025), told as the tool: a co-pilot in Rhino/Grasshopper that proposes the next
building element from a partial graph. Three datasets of 180,000 subgraphs come from 22 residential IFC models. Three
networks are trained: one predicts the element's type; one predicts its position, angle and size; one predicts only angle
and size, given the position. Each mode of the tool shifts who decides: Restricted (user gives type and position),
Partial Assistance (user gives type), Fully Autonomous (the tool gives everything).

Results
- Type: 79.26% accuracy with graph message passing and a GRU, 71.14% with a plain MLP without them, 16.67% by chance.
- How the graph is taken apart matters: 64.02% (hierarchical BFS), 53.43% (random BFS), 49.26% (minimal node degree), with
  fixed parameters over 45 epochs.
- Geometry: an average distance of about 22 m without the position and about 15 m with it. Predictions gather in a narrow
  range of locations, which the authors call overgeneralization.
- Usability, 20 participants, 19 of them architecture students: Restricted 56.25, Fully Autonomous 53.75, Partial Assistance
  51.875, all "OK" on the SUS scale. All participants finished in Restricted. In the other two modes they struggled with
  overly simple predictions, and completing the task relied on their corrections.

For the thesis
- Precedent for the second half of the question, with the same gap as Hornung: it returns geometry to Rhino, writes no IFC
  or Revit element, and measures no validity. Its authors ask for rules such as columns attached to slabs.
- Not independent evidence: same authors, dataset and network as Hornung et al. Do not count them as two confirmations.
- The graph adds about 8 points over the MLP. That is the measured value of relations here, and the number the hypothesis
  should have to beat, not the 16.67% of chance.
- Validation is not on unseen buildings: subgraphs from the same IFC models are on both sides, and the authors say so. The
  thesis should split by project from the start.
- People kept the most control and rated that highest, by a small margin in a small sample. It fits decision delegation
  but does not prove it.
- Its authors see the dataset as the first limit: residential, one region, and no open, diverse IFC dataset to use.

Doubts from reading it (Claude's, not the paper's)
- The evaluation metric is the mean of all vertex-to-vertex distances between two boxes, so a perfect prediction does not
  score zero and large elements score more. So 22 m and 15 m are not positional errors. They only compare models.
- Formula (3) as printed subtracts the second sum. A perfect respondent would get 50, not 100, and a neutral one also 50.
  It looks like a misprint, but if it was used, scores near 50 would come from the formula. The paper does not let us check.
- The text reports dropout of 0.2 and 0.3 for the type network, while its hyperparameter table lists 0.0.
- The hierarchical order may score higher partly because its order is easier to guess, not because the model learned more.
  The paper does not test this.
