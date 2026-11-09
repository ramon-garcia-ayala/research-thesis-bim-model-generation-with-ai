## 2026-11-08 · Summary
A method that learns a grammar from one example shape and then generates new shapes from it. The example is a 2D polygon
drawing (some preliminary 3D); its edges are labeled by the faces on each side and their angle. Every edge is cut into two
half-edges, so the shape falls apart into the smallest pieces ("primitives"). The pieces are glued back in every possible
way, and the matching ways of gluing become the rules of a graph grammar. A random walk over the rules builds a new graph,
and rejection sampling gives it vertex positions. "Valid" here means locally similar: every small region of the output
matches a small region of the example. No machine learning is involved.

Results
- Output is shown as pictures: 18 example shapes in Fig. 8 and 12 in Fig. 9, each with its generated shapes. There is no
  score for quality or validity.
- Table 1 (13 shapes): 9 to 45 input primitives, 8 to 367 rules, 9.5 to 93.7 s in total. The castle of Fig. 1 took 9.5 s,
  with 24 input primitives, 1,030 graphs in the hierarchy and 88 rules.
- Parameters were the same for all results (I = 5, J = 10). Only the iterations N changed, from 2k to 20k.
- Closure rule: every half-edge must end glued, so no piece is left open. Shapes with closed loops are handled, which the
  author says the earlier grammar methods (Bokeloh et al. 2010, Liu et al. 2015) could not do. This is shown in Fig. 10 on
  a few shapes only.
- The guarantee that the grammar makes every locally similar shape holds only if the hierarchy is finished. For Fig. 1 and
  Fig. 9e, g, h the hierarchy had to be cut short, and most 3D results too. Then the guarantee is lost.

For the thesis
- The closest formal template for "cut into parts and glue back": the cut has a fixed form, and the glue has a closure test
  that tells when a model is complete. Hornung and Renner learn the next element, with no such test.
- The half-edge label (face left, face right, angle) is a typed relation. In a BIM model the same job would be done by
  an element's type, its host and the relation to its neighbour. This is my reading, not something the paper says.
- It does not touch BIM: no IFC, no Revit, no element attributes, no real project. One example per grammar.
- It needs exact repetition. The author says it fails on noisy input and on a shape with no repeated parts (his example
  is a dog). Real Revit models are noisy, so this is where a learned model would have to come in.
- Only local constraints. Storeys, rooms and program are large-scale, and the paper leaves them out (Sec. 9.3).
- Nothing here is split by project or tested against held-out data. There is nothing to test: it has no training step.

Doubts from reading it (Claude's, not the paper's)
- The introduction says the grammars "can synthesize any locally similar shape". Sec. 5.7 says this is certain only when
  the hierarchy is finished, and that for many inputs it is not. The abstract and introduction do not carry that limit.
- Sec. 9.2 says it "only requires a small amount of training data". No experiment varies the amount of input.
