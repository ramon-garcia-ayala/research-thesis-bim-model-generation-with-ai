## 2026-11-08 · Summary
Tests a method that learns interior design rules from example layouts. Eighteen volunteers each furnished nine room
scenarios in a 3D editor (162 layouts). Two to eighteen of their layouts per room go to the rule learner, which writes
RuleDSL rules (distance, facing and alignment ranges between pairs of object types, kept as the tightest min-max bounds).
A search method then places furniture under those rules. In an online survey, 130 people scored 215 layouts from five
rooms on a 1 to 5 scale. The learnt rules are judged good if their layouts do not score significantly below the human ones.

Results
- Mean scores, Bathroom / Bedroom 1 / Kitchen 2 / Living Room 2 / Living Room 3: human 3.27 / 3.85 / 3.55 / 3.39 / 3.58;
  random 1.15 / 1.37 / 1.10 / 1.16 / 1.32; expert rules 2.62 / 2.70 / 1.39 / 2.12 / 3.32.
- Learnt from 2 layouts: 2.94 / 3.36 / 1.88 / 2.74 / 2.91. From 5: 2.53 / 2.81 / 1.57 / 1.62 / 2.48. From 18: 2.08 / 2.45 /
  1.16 / 1.38 / 2.54.
- The 95% intervals overlap the human ones for Bedroom 1, Living Room 2 and Living Room 3 learnt from 2, and for Bathroom
  learnt from 5. Kitchen 2 never overlaps. More input layouts gave worse layouts: outliers widen the ranges.

For the thesis
- Same shape as the thesis: examples are taken apart into pairs of objects with relations, a reusable pattern is kept, and
  new layouts are made from it. The pairs with Distance, Facing and Alignment are like edges of a graph.
- The learnt object is a rule a person can read and edit, not network weights. It is the explicit side of the choice
  between rules and learning.
- It does not write IFC or Revit: the rooms are furniture in the authors' own 3D editor, and the file format is not given.
- Validity here means perceived quality by survey, not code or model checks. Layouts come from a search, not from predicting
  elements.
- Small and specific: one room at a time, 18 non-expert layouts per room, no split by project, rules for pairs only.

Doubts from reading it (Claude's, not the paper's)
- "No significant difference" is read from overlapping confidence intervals. Several learnt intervals are wide (for example
  Living Room 2 learnt from 2: [1.90, 3.58] against human [3.10, 3.69]), so this may be a lack of power, not equivalence.
- The learner can only widen ranges, so it has no way to drop a bad input layout. The authors name this themselves.
