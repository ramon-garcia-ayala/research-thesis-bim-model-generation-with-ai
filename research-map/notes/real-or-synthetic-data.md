## 2026-11-08 · Summary
Where a dataset's size comes from: real models, augmented ones or synthetic ones.

What Hornung et al. (2025) say: most studies use synthetic or simplified data, and that is one of the two gaps they
target. They chose real BIM models. Their size comes from rotation and mirroring (22 usable files to about 109 buildings)
and then from splitting and deconstruction. Their cluster analysis still shows a skewed distribution and limited
diversity.

What they do not say: the paper does not test synthetic data and does not conclude how to improve it. "Hardcoded" appears
only as dictionaries for names and custom properties.

For the thesis
- The author's interest, 2026-11-08: "cómo es que se está llegando a las conclusiones de cómo podría mejorar incluso el
  tema del hard coding dataset o la generación de sintéticos."
- The contrast is ProcTHOR, where test performance rises with synthetic scale, but on procedurally generated houses.
- Open question (Claude's reading, not in the paper): whether parts decomposed from real models could seed the generation
  of new ones, giving more diversity than rotation and mirroring. It would have to beat a purely synthetic baseline, and
  nothing here shows yet that it does.
