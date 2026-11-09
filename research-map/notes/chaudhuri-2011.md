## 2026-11-08 · Summary
A Bayesian network learned from 3D shapes already cut into labelled parts (head, arm, torso...). It ranks which part
categories, and which parts inside each, fit the model the user is building. Each shape is yes/no variables: which
categories exist, how many parts of each (capped at 5+), which touch, which pairs are symmetric, and which style cluster
each part falls in (Gaussian mixture on geometric features). Structure is learned with a BIC score; ranking uses sampling.
Data: 491 Digimation models (creatures, aircraft, watercraft, furniture) and a library of 173 creature models.

Results
- Table 1: 180 of 491 and 64 of 173 shapes were segmented by hand, the rest by a trained segmenter. The networks have 595
  nodes and 1224 edges, and 265 nodes and 632 edges.
- User test: 42 volunteers, 141 tasks, three orderings chosen at random: the model, a static order by frequency, and the
  geometric method of Chaudhuri and Koltun (2010).
- Parts chosen from the first 2 categories shown: Toy task 64.6% (model), 23.5% (static), 21.3% (geometric); Creature task
  75.05%, 43.9%, 46.4%.
- Average session 21.4 min (model), 25.4 (static), 34.3 (geometric). Inference 2.8 s; the geometric method about 90 s.

For the thesis
- A learned network of semantic and style compatibility between parts, as the map expects. Its existence, adjacency and
  count variables are the kind of relations a BIM graph holds between element types.
- It does not generate a model: it ranks parts and a person assembles them. Not BIM: meshes, no IFC or Revit, nothing
  written to a BIM format, no validity check.
- Parts come from a segmenter trained on hand-labelled shapes. BIM elements already carry a category (Claude's reading).
- The unit is one shape, not a project, and nothing is split by project. A BIM version would need that split.

Doubts from reading it (Claude's, not the paper's)
- It says the model "significantly" increases relevance, but reports no test, interval or count of tasks per condition.
- Relevance is the rank of a part when picked. The order shown also steers the pick, and the paper does not control for
  that, so some of the gain may be position bias.
