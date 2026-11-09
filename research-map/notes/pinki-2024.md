## 2026-10-22 · Summary
A Python/Tkinter prototype: the user draws a plot, picks boundary points (slanted or rectilinear) and interior
points (atriums), then dissects blocks horizontally or vertically, typing a dimension at each step (a slicing
tree). Leaves become rooms; infeasible dimensions are rejected. No dataset, no learning: shown by regenerating two
Palladian plans (Villa Badoer, Palazzo Della Torre) and six example plan types.

Results: qualitative only; rectangular, orthogonal and non-rectangular dimensioned plans, with or without open
spaces. Stated limits: the user decides every cut and dimension, no adjacency, no circulation, no evaluation by
architects. Future work: automate dissection with rules ("a bedroom must have a window… at least 8 feet wide").

For the thesis
- Sits exactly at manual → rule-based, the step where GFit begins.
- Its stated next steps (rules, adjacency, circulation) are what GFit already does, for industrial buildings.
- A useful foil, not support: it says nothing about datasets or ML.
