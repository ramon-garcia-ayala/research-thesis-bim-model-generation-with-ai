## 2026-11-15 · Summary
Meehan, Chaudhuri and Dasgupta (AISTATS 2020). The paper defines data-copying: a generative model memorizes and outputs
training samples or small variations of them. Common scores (Inception Score, FID, precision and recall, kernel MMD)
compare training and generated samples in aggregate and reward a model that only makes slight variations of the training
set, so they miss it. The authors give a three-sample, non-parametric test: the training set T, a separate sample from the
real distribution (the held-out or test sample) and a generated sample. For each point the distance to its nearest
training point is computed; data-copying is when generated points are on average closer to the training set than held-out
points are. The comparison is a Mann-Whitney U test, z-scored (ZU: much below 0 is copying, much above 0 is underfitting).
Because a model can copy in one region and underfit in another, the space is split into cells (k-means on the training
set), the test is run in each cell, and the cells are averaged by the share of held-out points in them into a statistic CT.
Tested on Gaussian kernel density estimators (moons and MNIST), MNIST VAEs and a BigGAN on three ImageNet classes.

Results
- Example from an MNIST VAE (Fig. 1c): one cell with ZU = -8.54 (data-copied) and one with ZU = +3.30 (underfit).
- Kernel density estimators (Fig. 3): CT is about 0 at the maximum-likelihood bandwidth and responds sharply to a smaller or
  larger one; the two-sample nearest-neighbour baseline is higher variance and less sensitive for overfit models.
- MNIST VAE (Fig. 4b to 4c): more complex models overfit and give CT much below 0, simpler ones underfit and give CT much
  above 0. The ELBO generalization gap is insensitive to over and underfitting, and all nearest-neighbour accuracies are
  above 0.5 for every latent dimension.
- BigGAN on ImageNet (Fig. 4d): CT stays well below zero until the truncation threshold is nearly at its maximum, so the
  generated images are closer to the training set than real ones are, while FID finds the distributions roughly similar.
  Cells with ZU = -1.46 (coffee) and -1.00 (soap bubble) are data-copied (Fig. 5).
- Limit: the test needs enough held-out samples. With only 50 test samples per class in the BigGAN experiment, the space
  can be split into only three cells.

For the thesis
- The test fits the thesis plan (new-not-replicated): train on some models, hold one out, and ask whether what the model
  generates sits closer to the models it learned from than the held-out model does. The held-out model is the third
  sample. That is an inference about the planned split; the paper does not use buildings.
- It needs a distance between samples. For Revit graphs that is not given: a graph edit distance, a graph kernel or
  distances between embeddings would have to be chosen, and the test is only as meaningful as that distance.
- The sample size is the main risk. The test wants many held-out and generated samples (the authors name this as their
  limitation), and one held-out model out of ten gives few; the subgraphs or elements of that model could serve as samples,
  but they are not independent.
- It separates copying from the usual scores, which supports the point of accuracy-on-own-models: a good score on the
  models it learned from does not show it has learned to generate, and the held-out sample is what keeps a good
  score from being read as memory.
- The null hypothesis is that generated and held-out points are equally close to the training set. A later preprint
  (Majhi and Bagchi 2026, not imported) reports in its abstract that this test flags 10 of 24 generators that reproduce
  nothing, so the result should be checked with a second test (the abstract only was read).
