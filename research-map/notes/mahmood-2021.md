## 2026-11-15 · Summary
Mahmood, Mansimov, Bonneau and Cho (Nature Communications 12, 3156, 2021). A masked graph model for molecules: it learns
the conditional distribution of unobserved atoms (nodes) and bonds (edges) given the observed ones. Training masks
nodes and edges of a graph and predicts them. Generation uses the same model: start from an initial graph (a training
graph or a graph drawn from the marginal), mask a part, replace it with the model's sample, and repeat for many
iterations. It is evaluated on QM9 and ChEMBL with the five GuacaMol metrics (validity, uniqueness, novelty,
KL-divergence and Fréchet ChemNet Distance), against SMILES-based autoregressive models and graph-based models.

Results
- Validity, KL-divergence and Fréchet distance correlate highly with each other and negatively with novelty; uniqueness
  does not correlate strongly with any other (Tables 1 and 2, Spearman correlation).
- The masked graph model trades novelty for similarity to the data more effectively than the LSTM and Transformer
  baselines: the slope of Fréchet distance against novelty is smaller (Fig. 1). On QM9, MGM with a 10% or 20% masking rate
  keeps a larger Fréchet score as novelty rises. On ChEMBL the autoregressive baselines generally reach a better
  combination, apart from a few 5% points beyond the Transformer Regular frontier.
- Generation masking rate: QM9 uses 10% or 20%; ChEMBL uses 1% or 5%, because higher rates gave low validity. On ChEMBL
  a 1% rate gives points beyond the frontier of 5%: masking more components hurts quality even when the share is small.
  The authors note that the absolute number of masked components, not the share, drives quality: about 4 prospective
  edges for a median ChEMBL molecule at 1% and for a median QM9 molecule at 10% (Methods).
- Best configuration on QM9 (10% rate, training initialization, Table 3): validity 0.886, uniqueness 0.978, novelty 0.518,
  KL-divergence 0.966, Fréchet 0.842. On ChEMBL (1% rate, Table 4): 0.849, 1.000, 0.722, 0.987, 0.845.
- Conditional generation on a target property keeps KL-divergence above 0.8 in all cases but one (Table 5).

For the thesis
- The one case here where masking is also the way to generate, and where the paper measures what the thesis question asks
  for: a valid result and a new one, together. The masking rate at generation time is a dial between the two, and the
  paper shows it as a curve (new-not-replicated, masking-training).
- Novelty here is the GuacaMol one, the share of generated molecules not found in the training set. That is an exact
  match, so a near copy counts as new; the thesis needs a stricter test (new-not-replicated).
- The remark on the absolute number masked is useful for building graphs, which vary much more in size than molecules:
  the rate may have to be set as a number of elements, not a percentage. That is an inference for Revit, not tested here.
- Molecules are small graphs of a few types of atom and bond, and validity is chemical valence, which RDKit checks. A
  Revit model needs its own checker; the paper offers no replacement for it.
- Generation by repeated masking and refilling is one of the ways to generate that the thesis can try besides placing
  one element at a time (assemble-node-by-node), and it needs no fixed order; the authors point out that the ordering
  an autoregressive model needs is largely arbitrary and hard to predict in effect.
