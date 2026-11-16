## 2026-11-15 · Summary
Hou, Liu, Cen, Dong, Yang, Wang and Tang (KDD 2022). GraphMAE is a masked graph autoencoder for self-supervised
pre-training. Instead of rebuilding the structure of the graph, it hides the features of a random share of the nodes
with a [MASK] token, encodes the corrupted graph with a GNN, re-masks the code of the selected nodes with a second
token ([DMASK]) and decodes with a GNN, so each masked node has to rebuild its features from its unmasked neighbours.
The error is a scaled cosine error (cosine error raised to a power gamma >= 1) instead of the mean squared error. The
masked nodes are drawn uniformly at random without replacement. The method is tested on 21 datasets in three tasks:
node classification, graph classification, and transfer learning on molecular property prediction (pre-trained on 2
million molecules from ZINC15).

Results
- Across the 21 datasets, GraphMAE reaches the best or competitive results against contrastive and generative
  self-supervised baselines in node classification (Table 1), and outperforms them by a large margin against other
  generative methods. In graph classification it beats all self-supervised baselines on five of seven datasets and is
  competitive on the other two (Table 2).
- Mask ratio (Fig. 3): in most cases a low ratio (0.1) is not challenging enough. The best ratio varies by graph: in
  Cora, going above 0.5 degrades performance, while in PubMed and MUTAG GraphMAE still works with 0.7 to 0.9. The
  authors tie this to information redundancy: large node degrees or high homogeneity let a missing feature be recovered
  from very few neighbours. Ogbn-arxiv and IMDB-B are in Fig. 5. For molecules the mask rate is 0.25.
- Reconstruction error (Table 4): the scaled cosine error beats the mean squared error by an absolute gain of 1.5% to
  8.0% in node classification.
- Masking and re-masking (Table 4): without masking the input features performance drops significantly; without the
  re-mask, accuracy drops 0.1% to 1.9%.
- Decoder (Table 4): a GNN decoder typically beats an MLP; replacing GAT by GCN costs about 2.9% on Cora and about 2.0%
  on PubMed.
- On PPI, with a hidden size of 2048x4, GraphMAE outperforms the supervised counterpart (Fig. 4).

For the thesis
- The basis of masking-training: hide part of the graph, train a model to rebuild it. Its answer to "how much to hide"
  is that there is no single value; it depends on how redundant the graph is. A Revit graph with many repeated walls,
  doors and windows may be closer to PubMed (0.7 to 0.9) than to Cora, but that is an inference to measure, not
  something the paper says.
- It hides node features, not nodes or edges: the structure stays visible and only attributes are predicted. For the
  thesis that is one of the cuts to test (hide the attributes of an element), next to hiding whole elements or relations.
- The masked nodes are chosen uniformly at random; the authors argue this avoids a bias centre, so that a node's
  neighbours are neither all masked nor all visible. A masking of whole rooms or whole walls of one kind would break
  that assumption.
- It is a representation learner, not a generator: the output is embeddings for classification, and nothing is made.
  Generation needs another step (see mahmood-2021 and choi-2026).
- Citation graphs, protein graphs and molecules, no buildings, and no measure of whether results are new or copied.
