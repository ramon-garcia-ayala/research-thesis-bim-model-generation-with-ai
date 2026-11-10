## 2026-11-10 · Summary
Author (advice the thesis supervisor approved): the training step should include masking. Hide data in the dataset and have the AI predict what comes next, completing the incomplete dataset. It does not have to be a graph neural network.
Claude: three papers in the map already do a version of it.
- Han et al. (BIGNet) mask half of the nodes of graphs taken from Revit models and rebuild them.
- Liang et al. (Building-Graph-AI) mask the interior walls of a Revit model and predict them from the outline and the main entrance.
- Hornung et al. remove one node from a partial graph, and that node is what the network predicts.

For the thesis
- It is step 04 of the pipeline: the labelled graph goes in, masked examples come out, and a model learns to fill them.
  It widens the plan of 2026-11-09 (take the graph apart, predict the next element): the next element is one thing to
  hide, not the only one.
- Open, Claude's questions: what is hidden (an element, a relation, a whole class such as the openings, a subgraph), how
  much, and which model fills it (a graph network or another).
- The training pairs come from the 10 models of one typology, with 9 for training and 1 kept unseen.
