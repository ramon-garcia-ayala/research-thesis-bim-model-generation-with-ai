## 2026-11-10 · Summary
Author: the experiments worth running are placing all the elements in the viewport at once and then one by one, or placing one
and then its adjacent ones.
Claude: three orders to compare.
1. All at once: every predicted element goes in together. Building-Graph-AI predicts all its wall classes at once.
2. One by one: each element goes in after the last, as Hornung does with the next element.
3. One and then its neighbours: place one, then those joined to it by a relation, and so on.

For the thesis
- To compare them fairly, the same masked model, the same trained model and the same checks: the comparison at 1 cm, the
  Revit warnings and the relations kept.
- Open, Claude's questions: the order for one by one (the class order of the labels: level, floor, columns, walls,
  openings, rooms) and what counts as a neighbour (an element joined by a typed edge).
