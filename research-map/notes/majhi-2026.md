## 2026-11-15 · Summary
Majhi and Bagchi (George Washington University, arXiv preprint 2610.00251, not peer reviewed). The paper says that
memorization audits of generative models read a similarity score against a threshold with no null distribution, so the
conclusions can be wrong. It supplies two nulls. For a whole model, the training images and the held-out images are
exchangeable given the model's samples, so relabelling which real images are "training" gives a permutation test (the
"swap test") that is exact for any statistic when the held-out images are a random split of the same pool. For a single
image there is nothing to relabel, so the image is ranked against control images the model has not memorized, each
generated the same way, with a conformal p-value and false-discovery control. It tests this on 29 generators with ground
truth (diffusion models, autoencoders and adversarial networks, mostly on CIFAR-10) and on the MemBench benchmark of
Stable Diffusion v1.4 (3,000 prompts, 61 source images still retrievable). It recommends as statistic the small-scale
mass of the Intersection Euler Characteristic Profile, a topological count restricted to the scale of near-duplicates.

Results
- Against the data-copying test of Meehan et al. (2020): "read against its own null, flags ten of twenty-four generators
  that reproduce nothing". A model that never sees its training set but samples a narrower normal is reported as
  copying at -9.8 by the data-copying statistic, while the swap test gives a p-value of 0.91 (Proposition 2); a model
  that copies a fifth of its samples is caught by both (-3.7; swap p-value 0.0005). The cause: a model concentrated where the data has
  mass lies nearer every real point, trained on or not.
- Table 2: on 29 generators (4 reproduce, with at least a fifth of samples within the near-duplicate radius of a
  training image; 24 reproduce essentially nothing: 11 diffusion models with at most six copies, 13 autoencoders and
  adversarial networks with none), every statistic detects the 4. Of the 24: the nearest-neighbour fraction rejects on
  7, the data-copying statistic on 5, and a count restricted to the near-duplicate scale on none (the abstract gives
  McNemar 0.016 for this comparison). Ten copies injected among 500 samples are caught by the scale-restricted statistics in
  every replicate; the nearest-neighbour fraction needs fifty.
- Per image, two natural nulls fail: ranking an image among random images yields 596 false discoveries among 2,365
  controls (semantic leakage), and resampling independent generations makes the null three times too narrow.
- Calibrated against matched controls, the audit certifies 36 of 61 MemBench images at 5% false-discovery rate (44 with
  Storey's adaptive procedure), held-out controls are certified in 0.01% of calibration splits, and a calibrated maximum
  certifies 46. Two generations per image recover the count on this benchmark.
- Only 39 generations (2.1%) of the 1,826 generations from memorized prompts are pixel-level copies, of 5 images: the
  memorization is mostly at layout level.
- MemBench mitigations: by the benchmark's rule they roughly halve Stable Diffusion's memorization; under the audit
  with false-discovery control, two thirds of the certified images are no longer detected under random prompt
  perturbations, five sixths under attention rescaling, and all under embedding optimization.
- Limits given by the authors: the audit needs the training images; the model-level test is exact only when the
  held-out images are a random split, and with matched controls (as on Stable Diffusion) exchangeability is an assumption.

For the thesis
- It fits the plan of training on some models and keeping one aside, because the swap test needs exactly that: a
  training set and a held-out set drawn at random from the same pool. If the held-out model is chosen by hand, the test
  is not exact. With a few models, the permutation count is small, which the paper does not address (its sets have
  hundreds of images).
- It warns against Meehan et al. (meehan-2020) as the only test: the data-copying test can flag a generator that has not
  seen the training set, if it simply concentrates on where the data is. A Revit generator trained on ten similar
  models would probably be such a generator, so a copy test needs the permutation null as a check.
- It gives a reason not to use a bare similarity threshold such as the 0.5 of somepalli-2023 or the exact match of
  polykovskiy-2020.
- Everything is on images and embeddings; there is no graph or building case, and the topological statistic is
  unrelated to Revit elements. The distance between two Revit models (graph edit distance, a kernel, an embedding) has
  to be chosen by the thesis.
- It is a preprint from this year and the numbers have not been reviewed; cite with that caveat.
