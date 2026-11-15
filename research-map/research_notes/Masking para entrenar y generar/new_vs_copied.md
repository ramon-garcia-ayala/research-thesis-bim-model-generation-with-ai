# New vs copied: measuring memorization

Sub-question: metrics and protocols that compare each generated sample with the training set (nearest-neighbour
distance, novelty and uniqueness rates, memorization tests). Run of 2026-11-15 (skill `paper-research`).
Labels as in `../Descomponer IFC reales y generar nuevos/assembly_methods.md`.

Search: OpenAlex 10 queries (≈205 screened), arXiv API 7 queries (≈59 screened, one 429). Nothing found for floor-plan
novelty or graph-edit-distance novelty. A 3D-shape memorization paper (doi:10.1109/cvprf71909.2026.00180) had no open
PDF. 6 cards, 5 accepted, 1 rejected.

| # | Title | Authors | Year, venue | Id | PDF | What it shows | Relevance | Verified |
|---|---|---|---|---|---|---|---|---|
| 1 | A Non-Parametric Test to Detect Data-Copying in Generative Models | Meehan, Chaudhuri, Dasgupta | 2020, AISTATS (PMLR 108) | [arXiv:2004.05675](https://arxiv.org/abs/2004.05675) | [arXiv](https://arxiv.org/pdf/2004.05675), OK | Defines data-copying and a three-sample test: training set, held-out sample and generated sample, by how close generated points sit to training points compared with held-out ones. | High | PDF-partial |
| 2 | Diffusion Art or Digital Forgery? Investigating Data Replication in Diffusion Models | Somepalli, Singla, Goldblum, Geiping, Goldstein | 2023, CVPR | [10.1109/cvpr52729.2023.00586](https://doi.org/10.1109/cvpr52729.2023.00586) | [arXiv](https://arxiv.org/pdf/2212.03860), OK | Retrieves each generation's nearest training match; the baseline is the training set's own top-1 self-similarity. Replication is frequent with 300 and 3,000 training images and not detected on full ImageNet. | High | PDF-partial |
| 3 | Molecular Sets (MOSES): A Benchmarking Platform for Molecular Generation Models | Polykovskiy, Zhebrak, Sanchez-Lengeling, Golovanov, Tatanov, Belyaev, Kurbanov, Artamonov, Aladinskiy, Veselov, Kadurin, Johansson, Chen, Nikolenko, Aspuru-Guzik, Zhavoronkov | 2020, Frontiers in Pharmacology 11:565644 | [10.3389/fphar.2020.565644](https://doi.org/10.3389/fphar.2020.565644) | [Frontiers](https://www.frontiersin.org/articles/10.3389/fphar.2020.565644/pdf), OK | Validity, uniqueness and novelty ("the fraction of the generated molecules that are not present in the training set. Low novelty indicates overfitting"), plus SNN, similarity to the nearest reference neighbour. Novelty is exact match only. | High | PDF-partial |
| 4 | The Null Is the Hard Part: Exact Tests for Memorization in Generative Models | Majhi, Bagchi | 2026, arXiv preprint | [arXiv:2610.00251](https://arxiv.org/abs/2610.00251) | [arXiv](https://arxiv.org/pdf/2610.00251), OK | Similarity thresholds have no null; a permutation test over training vs held-out gives one. The abstract reports that a nearest-neighbour preference still fires on 7 of 24 generators and that the data-copying test (#1) flags 10 of 24 that reproduce nothing. | High | PDF-partial |
| 5 | Data Plagiarism Index: Characterizing the Privacy Risk of Data-Copying in Tabular Generative Models | Ward, Wang, Cheng | 2024, arXiv preprint | [arXiv:2406.13012](https://arxiv.org/abs/2406.13012) | [arXiv](https://arxiv.org/pdf/2406.13012), OK | Per training record, a k-nearest neighbourhood of held-out and synthetic records; mixed-type tables, closer to element attribute tables than images. | Medium | PDF-partial |

Rejected: *PolyGraph Discrepancy* (Krimmel et al., ICLR 2026, arXiv:2510.06122) — it measures how close two graph
distributions are, not whether a sample copies a training graph.

Missing (validator): no copy test made for graphs (graph edit distance or a graph kernel to the nearest training graph),
and nothing that checks "new and valid" together. Adapting these to Revit graphs is the thesis's own step.
