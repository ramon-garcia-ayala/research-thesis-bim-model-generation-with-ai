## 2026-11-08 · Summary
A generative probabilistic model of how a shape is built from labelled parts, learned without supervision from 22 to 100
example shapes per domain. Latent variables stand for the style of the whole shape and the style of each part category;
observed ones are the number of parts per category, their geometric features and how many neighbours of each category
they touch. New shapes come in two steps: a tree search lists high-probability sets of existing parts, then the parts
are placed by matching "slots" (marked regions that say which category can attach there) and a least-squares fit.
Data: five sets of 3D meshes from public libraries, segmented and labelled with the authors' own method plus manual work.

Results
- Five datasets: planes 100 shapes, construction vehicles 22, chairs 88, ships 42, creatures 69. From them the model
  synthesizes 1267, 253, 870, 199 and 563 new shapes.
- Held-out likelihood (three random 80-20 splits): the full model has the lowest negative log-likelihood on all five
  datasets, against variants with CPTs, with maximum likelihood, without lateral edges and without latent variables.
- With less training data (80% down to 20%) the likelihood worsens; for construction vehicles, 20% is four examples.
- Perceptual test: 107 student volunteers, 3210 pairwise comparisons of plausibility. Against Chaudhuri et al. (2011) the
  model won 612 to 239 (199 undecided). Against the training shapes: 414 for the model, 440 for the originals, 211 undecided.
- Learned lateral edges: 9 for vehicles, 24 creatures, 35 chairs, 36 planes, 89 ships. Learning takes 0.5 to 70 hours.

For the thesis
- The closest precedent for "decompose into parts and reuse them to generate", with labelled parts and attachment points
  between them. It shows that a small, unsupervised model can recombine parts into shapes people rate as plausible.
- It is not BIM: meshes of objects, not IFC or Revit elements. Nothing is written to a BIM format, and there is no
  semantic data beyond the part category and the geometry features.
- Validity is human plausibility and likelihood. No physical, code or consistency rule is checked.
- The split is random over shapes. Each shape is one object, not a project, so it says nothing about unseen projects.
- Decomposition was not learned: parts came from segmentation and labelling, partly by hand. In a BIM model the elements
  and their categories already exist (Claude's reading), so that step could come for free.
- The slots are the idea to keep: relations stored on the part that receives, not on the part that attaches.

Doubts from reading it (Claude's, not the paper's)
- The perceptual test is called informal by the authors. The paper does not say what counts as one observation in the
  t-test (comparison or volunteer), nor how many judgements are independent.
- Rejecting near-copies of training shapes is called optional, and the paper does not say whether the counts of new
  shapes above are taken after it.
