# Who already masks building data

Sub-question: masked or completion tasks on BIM, IFC, building graphs, floor plans, room layouts or indoor scenes —
hide part and predict it back. Already in the library and not repeated here: Han et al. 2025 (BIGNet), Liang et al.
2025 (Building-Graph-AI), Hornung et al. 2025, Fuchs & Borrmann 2025. Run of 2026-11-15 (skill `paper-research`).
Labels as in `../Descomponer IFC reales y generar nuevos/assembly_methods.md`.

Search: OpenAlex ≈150 results over 19 queries, plus the 25 works citing Han et al. 2025 (mostly off topic); arXiv API
one query, then 429 on all others. Closed or unreachable: ScienceDirect 403, ACM 403 (Scene Graph Masked VAE,
10.1145/3581783.3612262), MDPI 403 (10.3390/app8091529), ETH Research Collection 429/500, mediaTUM behind a bot check.
Two Automation in Construction 2026 self-supervised BIM papers (10.1016/j.autcon.2026.107075, 10.1016/j.autcon.2026.107169)
have no open copy listed. 6 cards: 1 accepted, 2 doubt, 3 rejected.

## Accepted

| Title | Authors | Year, venue | Id | PDF | What it shows | Relevance | Verified |
|---|---|---|---|---|---|---|---|
| SceneNAT: Masked Generative Modeling for Language-Guided Indoor Scene Synthesis | Choi, Park, Kim | 2026, arXiv preprint (under review at TMLR) | [arXiv:2601.07218](https://arxiv.org/abs/2601.07218) | [arXiv](https://arxiv.org/pdf/2601.07218), OK | A masked, non-autoregressive transformer over discretised semantic and spatial attributes of indoor scenes, masking both single attributes and whole objects, then unmasking in steps (3D-FRONT). Furniture, not BIM. | Medium-high | PDF-partial |

## Doubt — the author should open these in a browser

| Title | Authors | Year, venue | Id | Where | What it shows | Why doubt |
|---|---|---|---|---|---|---|
| Masked irregular layout planning from partial input with fused modalities | Hang Zhang, Anton Savov, Benjamin Dillenburger | 2026, Automation in Construction 190, 107120 | [10.1016/j.autcon.2026.107120](https://doi.org/10.1016/j.autcon.2026.107120) | [ETH Research Collection](https://www.research-collection.ethz.ch/handle/20.500.11850/802682), CC BY 4.0 per Crossref and OpenAlex | MaskLayout: a graph-structured generative transformer for apartment plans inside irregular boundaries, six room attributes, trained with dynamic masking to simulate incomplete input, parallel decoding, a benchmark of more than 43,000 apartments (abstract). | Open per the indexes, but neither PDF could be checked by script (HTML, 429, 500). Abstract only. **The closest AEC paper of the run.** |
| Exploring link prediction on multidisciplinary BIM graphs using graph neural networks | Abdallah Shoaip | 2026 (OpenAlex), master's thesis, TUM | [mediaTUM 1841525](https://mediatum.ub.tum.de/1841525) | mediaTUM, behind a bot check | Predicts missing host / corresponds_to links between architectural and structural IFC elements (GCN, GraphSAGE, GAT, GIN), seen and unseen projects. Edge completion, not masking. | PDF not verifiable by script. |

## Rejected

- *Anomaly Detection in Incomplete BIM Models Based on Contrastive Learning* (Wisniewski, Wojcik 2025,
  doi:10.64972/dea.2025.v3i1.81): anomaly detection with missing data as perturbation; nothing is hidden and predicted.
- *LayoutTransformer* (Gupta et al., ICCV 2021, arXiv:2006.14615): autoregressive completion from a seed, no masked
  training, no building data. Background at most.
- *3D Indoor Scene Completion via Room Layout Estimation* (Xia et al. 2021, doi:10.1088/1742-6596/2025/1/012102): fills
  holes in scans.

Missing: a masked or completion paper on real BIM/IFC/Revit element graphs, beyond the four already in the library,
with a checked open PDF.
