# Placement order: all at once, one by one, or by neighbours

Sub-question: how the generation order changes the result — autoregressive vs parallel/iterative masked generation vs
adjacency or BFS order — in layouts, scenes, graphs or sets of objects. Run of 2026-11-15 (skill `paper-research`).
Labels as in `../Descomponer IFC reales y generar nuevos/assembly_methods.md`.

Search: OpenAlex 8 queries × 25 (200 screened); arXiv API 301 over http, then 429 (rate limit), so no arXiv search.
6 cards, 5 accepted, 1 rejected.

| # | Title | Authors | Year, venue | Id | PDF | What it shows | Relevance | Verified |
|---|---|---|---|---|---|---|---|---|
| 1 | Forest2Seq: Revitalizing Order Prior for Sequential Indoor Scene Synthesis | Sun, Zhou, Zhou, Li, Li | 2024, ECCV | [10.1007/978-3-031-72698-9_15](https://doi.org/10.1007/978-3-031-72698-9_15) | [arXiv](https://arxiv.org/pdf/2407.05388), OK | Orders scene objects by clustering into trees and walking them breadth-first, for an autoregressive transformer. Table 4 compares random, shuffled, fixed, tree+BFS, forest+DFS and forest+BFS on 3D-FRONT; BFS beats DFS (FID, KL). | High | PDF-partial |
| 2 | Let There Be Order: Rethinking Ordering in Autoregressive Graph Generation | Bu, Mehrab, Karpatne | 2023, arXiv preprint (no later venue found) | [arXiv:2305.15562](https://arxiv.org/abs/2305.15562) | [arXiv](https://arxiv.org/pdf/2305.15562), OK | Compares random, SVD sort, BFS, DFS and a learned "latent sort" as orders for autoregressive graph generation; says no earlier work had compared them. | High | PDF-partial |
| 3 | Order Matters: Probabilistic Modeling of Node Sequence for Graph Generation | Chen, Han, Hu, Ruiz, Liu | 2021, ICML | [arXiv:2106.06189](https://arxiv.org/abs/2106.06189) | [arXiv](https://arxiv.org/pdf/2106.06189), OK | Treats node order as a latent variable instead of a fixed BFS/DFS; analyses how BFS biases the generated graphs. | High | PDF-partial |
| 4 | MaskGIT: Masked Generative Image Transformer | Chang, Zhang, Jiang, Liu, Freeman | 2022, CVPR | [10.1109/cvpr52688.2022.01103](https://doi.org/10.1109/cvpr52688.2022.01103) | [arXiv](https://arxiv.org/pdf/2202.04200), OK | All tokens predicted at once and refined over 8 steps, against 256 raster-order steps; mask schedules compared (Table 3). Images: cite as the method for "all at once, then refine". | High | PDF-partial |
| 5 | Halton Scheduler For Masked Generative Image Transformer | Besnier, Chen, Hurych, Valle, Cord | 2025, ICLR | [arXiv:2503.17076](https://arxiv.org/abs/2503.17076) | [arXiv](https://arxiv.org/pdf/2503.17076), OK | Which positions to unmask per step: confidence vs random vs quasi-random Halton; tokens filled in the same step should be weakly correlated. | Medium | PDF-partial |

Rejected: *Overcoming Order in Autoregressive Graph Generation* (Cohen-Karlik et al. 2024, arXiv:2402.03387) — it fixes
DFS and regularises against it; it does not compare orders.

Missing (validator): nothing on floor plans or building elements, and no paper that compares "one by one" with "one and
then its graph neighbours" or with parallel generation on the same layout or graph task.
