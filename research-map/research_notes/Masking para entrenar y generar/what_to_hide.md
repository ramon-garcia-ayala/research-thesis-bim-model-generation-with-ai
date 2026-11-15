# What to hide, and which model fills it

Sub-question: masked modelling on graphs and structured data — masking nodes, edges, features or subgraphs, how much
to mask, and which architectures reconstruct it. Run of 2026-11-15 (skill `paper-research`, scout on haiku, validator on
sonnet). Labels as in `../Descomponer IFC reales y generar nuevos/assembly_methods.md`. Numbers are as the validator
read them in the PDFs; check against the PDF before citing.

Search: OpenAlex 8 queries × 25 (165 unique titles); arXiv API mostly empty or redirected (ids taken from OpenAlex);
dl.acm.org 403 (S2GAE dropped for lack of an open PDF). 6 cards, 6 accepted.

| # | Title | Authors | Year, venue | Id | PDF | What it shows | Relevance | Verified |
|---|---|---|---|---|---|---|---|---|
| 1 | GraphMAE: Self-Supervised Masked Graph Autoencoders | Hou, Liu, Cen, Dong, Yang, Wang, Tang | 2022, KDD | [10.1145/3534678.3539321](https://doi.org/10.1145/3534678.3539321) | [arXiv](https://arxiv.org/pdf/2205.10803), OK | Masks node features, GNN decoder with re-mask. The best mask ratio depends on how redundant the graph is: 0.5 on Cora, 0.7–0.9 on PubMed and MUTAG; 0.1 is too easy (Fig. 3). Decoders compared (Table 4). | High | PDF-partial |
| 2 | What's Behind the Mask: Understanding Masked Graph Modeling for Graph Autoencoders | Li, Wu, Sun, Chen, Tian, Zhu, Meng, Zheng, Wang | 2023, KDD | [10.1145/3580305.3599546](https://doi.org/10.1145/3580305.3599546) | [arXiv](https://arxiv.org/pdf/2205.10053), OK | MaskGAE: masks edges (or paths) and predicts them; large ratios help, best near 0.7; theory on why it works. | High | PDF-partial |
| 3 | Graph Transformer GANs with Graph Masked Modeling for Architectural Layout Generation | Tang, Shao, Sebe, Van Gool | 2024, IEEE TPAMI | [10.1109/tpami.2024.3355248](https://doi.org/10.1109/tpami.2024.3355248) | [arXiv](https://arxiv.org/pdf/2401.07721), OK | House layouts from room graphs. Pre-training masks nodes and edges together; ablation 10–90% (Fig. 13), best at 40%, above that the remaining graph carries too little. | High | PDF-partial |
| 4 | Heterogeneous Graph Masked Autoencoders | Tian, Dong, Zhang, Zhang, Chawla | 2023, AAAI | [10.1609/aaai.v37i8.26192](https://doi.org/10.1609/aaai.v37i8.26192) | [arXiv](https://arxiv.org/pdf/2208.09957), OK | Typed nodes and typed edges: masks metapath-based edges and attributes, with an attribute mask rate rising from 0.5 to 0.8 (Fig. 3). | High | PDF-partial |
| 5 | GraphMAE2: A Decoding-Enhanced Masked Self-Supervised Graph Learner | Hou, He, Cen, Liu, Dong, Kharlamov, Tang | 2023, WWW | [10.1145/3543507.3583379](https://doi.org/10.1145/3543507.3583379) | [arXiv](https://arxiv.org/pdf/2304.04779), OK | Changes the decoder (multi-view random re-mask, latent target), not what is masked. | Medium | PDF-partial |
| 6 | Masked graph modeling for molecule generation | Mahmood, Mansimov, Bonneau, Cho | 2021, Nature Communications | [10.1038/s41467-021-23415-2](https://doi.org/10.1038/s41467-021-23415-2) | [Nature](https://www.nature.com/articles/s41467-021-23415-2.pdf), OK | Masks nodes and edges and generates by masking and re-filling in turns; the generation-time masking rate (10% or 20% on QM9, 1% or 5% on ChEMBL, per the importer's reading of the PDF; the validator had read "1%, 5%, 10%") trades validity against novelty. | High | PDF-partial |

Missing (validator): no comparison of node vs edge vs subgraph masking on building or BIM graphs, and no non-GNN filler
(masked transformer over a sequence of elements, discrete diffusion) in this set.
