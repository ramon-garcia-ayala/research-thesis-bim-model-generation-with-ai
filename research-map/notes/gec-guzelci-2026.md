## 2026-11-08 · Summary
Predicts door specifications from their spatial context, with Random Forest on a dataset of 5,763 door instances from
three Revit projects of different typologies: a hospital, an office and a recreational facility.

Results, Macro-F1 for leaf material: 0.926 within one project, 0.464 from hospital to office, 0.209 adding the
recreational facility to training. Accuracy alone hides the drop, since majority classes dominate.

For the thesis
- The only comparison found within a project, across projects and with combined typologies in Revit.
- It challenges the hypothesis: more data of mixed typologies made the result worse, not better.
- It is not a clean test of typology: the target projects differ and it predicts door attributes, not a design.
