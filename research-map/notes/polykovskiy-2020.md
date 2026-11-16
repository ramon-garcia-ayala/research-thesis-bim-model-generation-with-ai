## 2026-11-15 · Summary
Polykovskiy, Zhebrak, Sanchez-Lengeling, Golovanov, Tatanov, Belyaev, Kurbanov, Artamonov, Aladinskiy, Veselov,
Kadurin, Johansson, Chen, Nikolenko, Aspuru-Guzik and Zhavoronkov (Frontiers in Pharmacology 11:565644, 2020). MOSES
is a benchmark for models that generate molecules: a standard dataset, a fixed split, code to evaluate, and
implementations of baseline models. The dataset starts from the ZINC Clean Leads collection (4,591,276 molecules) and is
filtered (no charged atoms, only C, N, S, O, F, Cl, Br and H, no rings larger than eight atoms, medicinal-chemistry
and PAINS filters). The recommended split has three disjoint parts: train (1,584,664 molecules), test (176,075) and a
scaffold test (176,226), whose molecules have scaffolds absent from both train and test. The metrics are all computed
between the generated set G and the test set R: validity, uniqueness (Unique@1,000 and Unique@10,000), novelty (the
fraction of generated molecules not present in the training set), the share passing the filters, internal diversity, and
distribution similarities (fragment, scaffold, nearest neighbour, Frechet ChemNet distance, and Wasserstein-1 distance
for four properties). Baselines include HMM, NGram, a combinatorial generator, CharRNN, VAE, AAE, JTN-VAE and LatentGAN.

Results
- Table 1: HMM and NGram fail to produce valid molecules because their context is limited. The combinatorial generator
  and JTN-VAE have validity built in, so their validity is 100%.
- Table 2 (filters, novelty, internal diversity): the models avoid the forbidden structures although these were only
  defined implicitly, by the training set. The combinatorial generator has higher diversity than the training set.
  "Autoencoder-based models show low novelty, indicating that these models overfit to the training set."
- The VAE has the best nearest-neighbour similarity (SNN) but, with low novelty, the authors suppose it overfitted.
- Table 4: the scaffold similarity from the training set to the scaffold test set is zero by design, and CharRNN
  discovered many novel scaffolds (11%), which suggests it generalises well.
- Conclusion: CharRNN performs best on the key metrics, with the best FCD, fragment and scaffold scores, and the paper
  reads this as having captured the distribution without overfitting.
- The authors note that fragment and scaffold similarities compare substructures, so the similarity can be one even when
  the two sets contain different molecules.

For the thesis
- It is the definition of novelty that most generation papers use, and it is stated in one line: the share of generated
  items that is not in the training set, with low novelty a sign of overfitting. For new-not-replicated it is the
  baseline to adopt or to improve.
- The novelty counts exact matches only. A generated model that is a training model with one wall moved would count
  as new. The paper itself shows part of the answer: the scaffold split asks for something that is not in the training
  set at the level of substructure (not just as a whole molecule), which is the closer idea for a model made of parts.
  That use of the scaffold test is the paper's, the translation to Revit is an inference.
- It reports validity, uniqueness and novelty together, which is the combination the research question asks for
  (new and valid), but as separate numbers: nothing measures them jointly on the same sample.
- Molecules are checked for validity by a parser (RDKit), the way the thesis could check a Revit model with rules. The
  train, test and scaffold-test split is a template for the 9 models plus a tenth held out.
