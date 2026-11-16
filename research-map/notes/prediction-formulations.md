## 2026-11-15 · Summary
Author: wants the ways earlier generators split a prediction into steps on the map, as material for the experiments.
Source: §2.4.2 "Problem formulation" of MaskLayout ([Zhang, Savov and Dillenburger 2026](https://doi.org/10.1016/j.autcon.2026.107120),
zhang-2026), which describes five earlier floor-plan generators. Their notation: T room types, C room centres, A room
adjacencies, S room sizes, R room regions (polygons), B the site boundary given as a condition, U a partly masked input
given by the user. The numbers in brackets are the paper's own references.

| Generator | What it predicts first | Then | Shape of the process |
|---|---|---|---|
| RPLAN [14] | Types and centres of the rooms, one room after another, each given the ones before and B | Walls of the rooms; the bounding boxes follow implicitly | Sequential over rooms, then derived geometry |
| Graph2Plan [4] | Types, centres, adjacencies and sizes, retrieved from layouts that have a similar boundary B | Bounding boxes of the rooms, estimated | Retrieval of existing layouts, then estimation |
| WallPlan [6] | A first stage given B (written W′; the paper does not say here what W stands for, and in §3.1 it is windows, so walls is my reading) | The wall graph and the visual semantics, generated together, step by step | Two stages: structure, then everything at once |
| iPLAN [35] | Room types | Centres and bounding boxes together | Sequential, one kind of attribute per stage |
| MaskPLAN [17] | Attributes in a fixed order, T, C, A, S, R | The same pass, with the partly masked input U as a prior over the whole process | Masked completion, with a fixed order of attributes |

For contrast, MaskLayout itself (zhang-2026) predicts all the masked attributes of all rooms at once and decodes them
iteratively, room by room by confidence (§3.4), and its ablation compares that with an autoregressive transformer
(Table 2: 4.02 against 4.84 FID, lower is better).

For the thesis
- Two orders are mixed in this list, and the experiments can tell them apart *(my reading)*: the order over elements
  (which room, wall or door comes first, the three of placement-order-experiments) and the order over the attributes of
  one element (type, then place, then size, then relations, as in RPLAN, iPLAN and MaskPLAN). In Revit terms that is
  family type, then location, then dimensions, then host and joins. The question for the experiments is whether
  predicting the attributes in stages helps more or less than ordering the elements.
- WallPlan's structure-first stage is a fourth way to place things: the skeleton (walls, levels, grids) before what
  hangs on it (doors, rooms, furniture). Not one of the three orders of placement-order-experiments, and cheap to add as
  a variant: the order of the classes in the labels (level, floor, columns, walls, openings, rooms) already suggests it.
- Graph2Plan retrieves layouts that exist instead of generating new ones. That is the copy end of new-not-replicated
  and a baseline worth having: how much of a result is only retrieval.
- MaskPLAN is the closest to masking-training: a partly masked input as a prior, with a fixed attribute order. It is
  by the same group as MaskLayout and not read yet; a search of its own is the next step.
- All five work on room plans, not on Revit element graphs, and none writes a model back.
