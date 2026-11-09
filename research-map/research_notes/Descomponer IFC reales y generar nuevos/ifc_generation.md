# Generative models that learn from real BIM/IFC and output new building models

Verification tags used throughout:
- **[FT]** I read the full text myself.
- **[EX]** I extracted the PDF text and read targeted excerpts, not every page.
- **[AB]** Abstract or repository record only.
- **[SN]** Search snippet only; treat as unverified.

Date of the research: 2026-11-08.

## Which works train generative models on real BIM/IFC data?

### Takeaway
Only one line of work demonstrably trains a generative graph model on real IFC files from practice: the Stuttgart ICD pipeline (Hornung et al. and Renner et al., 2025), and its "DGMG" is a reduced one-node-at-a-time predictor. Your three leads are really two works plus an unverifiable report: the SAGE paper and the ICD paper share one dataset and pipeline, and the TUM report has no full text online.

### Cited Findings

**Stuttgart ICD pipeline: the closest match**

The two papers are a pair. Renner et al. say the dataset details "will be presented in a separate research paper", which is Hornung et al.

- Data collection [FT]: 148 firms in Germany and Austria were contacted, 24 gave substantive feedback, and that yielded 50 IFC files. Only 22 files survived. The other 28 lacked one of the six required classes or failed through corruption or IfcOpenShell parsing errors — [Hornung et al. 2025, pp. 872-873](https://doi.org/10.25442/hku.29365832).
- **Correction to the lead:** "50 BIM models" is the number collected, not the number used. The models are 22 residential projects, kept typologically homogeneous on purpose — [Renner et al. 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914).
- Augmentation and decomposition [FT]: rotation and mirroring gave about 109 buildings. A modified BFS cut them into 20-node subgraphs (over 600,000). Node-by-node deconstruction with three orderings (hBFS, rBFS, MND) gave over 1.8 million pairs of partial graph and removed node — [Hornung et al. 2025, pp. 873, 876-877](https://doi.org/10.25442/hku.29365832).
- **Correction to the lead:** "180,000 subgraphs" is a balanced resample of those pairs, capped at 30,000 per class, and each of the three orderings has its own 180k dataset. It is not 180,000 independent structures — [Hornung et al. 2025, p. 877](https://doi.org/10.25442/hku.29365832).
- Representation [FT]: only six classes are kept: IfcBuildingStorey, IfcSpace, IfcSlab, IfcWall, IfcColumn, IfcBeam. Geometry becomes an oriented bounding box `[x,y,z,alpha,mx,my,mz]`. Edges come from bounding-box overlap plus IFC containment and aggregation metadata. Customisable parameters were excluded — [Hornung et al. 2025, pp. 873-876](https://doi.org/10.25442/hku.29365832).
- Model [FT]: a classifier predicts the next node's type (GraphSAGE or GCN with a GRU and an MLP), and GAT regressors predict its box — [Renner et al. 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914).
- **Limit of the "DGMG" label** [FT]: it is a "simplified" DGMG that "focused solely on node storage during deconstruction and disregarded edge deletion and termination probability" — [Hornung et al. 2025, p. 877](https://doi.org/10.25442/hku.29365832).

**Seelos 2019 (TUM): the only abstract that combines an IFC writer with graph generators**

- [AB] The record describes a C#/.NET application using the XBIM library that creates IFC models automatically, software that reads IFC into a graph database, and an evaluation of GraphGAN and GraphRNN for learning IFC structure and generating models — [mediaTUM record](https://mediatum.ub.tum.de/1524969).
- The record has no result figures. It does not say whether training used real or generated IFC, although "automated creation" suggests synthetic data. The document type is "Report / Forschungsbericht", it is filed under master's theses, and the abstract calls itself a "Thesis" — [mediaTUM record](https://mediatum.ub.tum.de/1524969).

**Works that sound similar but do not train on real BIM**

- "Graph-BIM" / Building-Graph-AI [EX]: the training data are House-GAN floor plans converted to Revit models and exported through Dynamo to Excel: "We modify the housegan dataset and transform it into 3D BIM models in Revit". The string "IFC" does not appear in the extracted text — [Liang et al. 2025, post-print](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download); same data in the [CAADRIA 2024 precursor](https://papers.cumincad.org/data/works/att/caadria2024_386.pdf).
- Bauscher et al. 2024 [EX]: four famous modernist houses were re-modelled and augmented 100 times each (400 buildings) for a graph autoencoder. All buildings must have the same node count — [Bauscher et al. 2024](https://papers.cumincad.org/data/works/att/caadria2024_128.pdf). Conflict: a search summary said 500 variants per building [SN], and I could not trace it to a page; I use the paper's 400.
- Bauscher & Wortmann 2025 [AB]: a new generator of Mies-style models gives a more continuous latent space — [IJAC record](https://doi.org/10.1177/14780771251353797).
- Building-GNN [EX]: 4,000 rule-based voxel models for training, with no BIM or IFC mentioned — [Zhong et al. 2023](http://papers.cumincad.org/data/works/att/ecaade2023_166.pdf).
- Xia et al. 2024 [EX]: augmented DGMG plus Hetero-HouseGAN++ on the LIFULL floor plans; BIM is only future integration. It is a useful DGMG precedent in architecture but not BIM data — [Xia et al. 2024](https://ec-3.org/wp-content/uploads/2025/10/EC32024_188.pdf).
- Generative AIBIM [EX]: a conditional diffusion model generates 2D structural drawings; BIM is converted to and from drawings around it, and "IFC" does not appear in the extracted text — [He et al.](https://arxiv.org/pdf/2311.04052).
- AIPDORCS [EX]: 48 reinforced concrete projects were modelled for the study and scored by 106 engineers. The GNN classifies layouts and is described as a step toward generative tools, not as one — [Argaman & Sacks 2024](https://ec-3.org/wp-content/uploads/2025/10/EC32024_298.pdf).

### Inferences
- The "real IFC to generative model" literature is very thin. After about 20 web searches plus 10 OpenAlex queries I found one verified training corpus used for this purpose, and that corpus is 22 files.
- I found no GraphRNN, GAN, diffusion or VAE model trained on real IFC files with published results. Seelos may be the exception for GraphRNN/GraphGAN, but its results are unverified.
- The ICD model is better described as supervised next-element prediction than as a distribution-level generator. It has no learned edges and no stop decision.

### Gaps
- Seelos's full text. The record shows no PDF link, and two URLs I tried returned 404. It would need a request to the TUM Chair of Computing in Civil and Building Engineering.
- I could not rule out work in closed-access journals. In particular, [Gan 2022, Automation in Construction](https://doi.org/10.1016/j.autcon.2021.104062) is closed access and I did not read it. Snippets conflict on whether it uses a learned GAN or not, so it is not assessed here.
- [Building-VGAE, eCAADe 2024](https://doi.org/10.52842/conf.ecaade.2024.1.625) has a record only. I found no verified open PDF.

## What does each one actually output: spatial graph, geometry or real IFC? Is it validated?

### Takeaway
No work that learned from real IFC writes an IFC file, and no work that writes and validates IFC learned from real IFC. Those two groups do not overlap in anything I could verify.

### Cited Findings

| Work | Learned from | Actual output | Writes IFC? | Schema/checker validation? | Evidence |
|---|---|---|---|---|---|
| [Renner 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914) / [Hornung 2025](https://doi.org/10.25442/hku.29365832) | 22 real IFC files | One node at a time: class plus oriented box, shown as Rhino/Grasshopper geometry | No | None reported | [FT] |
| [Seelos 2019](https://mediatum.ub.tum.de/1524969) | Not stated | Separate IFC creation software; generator output unknown | Writer exists; link to the neural generator unknown | Unknown ("IFC schema conform" software is claimed) | [AB] |
| [Liang 2025](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download) | House-GAN plans converted to Revit | Edge classes on a 3D grid, rebuilt as Revit components | No, native Revit | None; room accessibility only | [EX] |
| [Bauscher 2024](https://papers.cumincad.org/data/works/att/caadria2024_128.pdf) | 4 remodelled houses | Surface geometry in Rhino/Grasshopper | No | None | [EX] |
| [Liang, Yabuki, Fukuda (ResBIM)](https://ir.library.osaka-u.ac.jp/repo/ouka/all/103515/AutomConstr_181_106584.pdf) | Neural layouts, then Revit API | Over 1,000 RVT models paired with plans | No, RVT | Not found in my excerpts | [EX] |
| [Fuchs & Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf) | 422 student IFC models | Infilled property values in IFC/ifcJSON text, geometry stripped | Partial text only | No | [EX] |
| [Text2BIM](https://arxiv.org/pdf/2408.08054) | No training | Native Vectorworks model exported to IFC | Yes, by export | Yes: Solibri custom rules, BCF feedback | [EX] |
| [Self-verification](https://ec-3.org/wp-content/uploads/2026/08/EC32026_444.pdf) | No training | IFC via IfcOpenShell / MCP4IFC tools | Yes | Yes: IDS via ifctester, plus LLM-written checks | [EX] |
| [MCP4IFC](https://arxiv.org/pdf/2511.05533) | No fine-tuning found; uses RAG | IFC via IfcOpenShell and Bonsai | Yes | Manual review of semantics; no schema check found in my excerpts | [EX] |

Details that matter for the thesis:

- The ICD authors say simplification costs information: bounding-box approximation and tensor engineering may "lose spatial and relational details". Doors, windows and openings are collapsed into the wall's box — [Hornung et al. 2025, pp. 875, 881](https://doi.org/10.25442/hku.29365832). [FT]
- Their stated next step is plugins in BIM platforms for IFC ingestion and feedback. They do not describe IFC export as implemented — [Hornung et al. 2025, p. 881](https://doi.org/10.25442/hku.29365832). [FT]
- Writing IFC is not the same as writing good IFC. MCP4IFC geometry looked structurally valid, yet walls did not connect at intersections, openings were not properly added, rooms lacked IfcSpace, and elements often lacked property sets and materials. The authors conclude generation is "feasible but not yet semantically robust" — [MCP4IFC](https://arxiv.org/pdf/2511.05533). [EX]
- In the self-verification case study, one requirement still failed after five iterations: the relationship between the eight IfcSpace entities and their storeys — [Sesterhenn et al. 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_444.pdf). [EX]

### Inferences
Progress toward a usable IFC can be read as a ladder:
1. Text or Q&A only (Qwen-BIM).
2. Graph or property values (Fuchs & Borrmann; Nabrotzky).
3. Geometry in a CAD tool (ICD; Bauscher).
4. Native BIM through an authoring API (Liang; ResBIM).
5. IFC written by code or export (MCP4IFC; Text2BIM).
6. IFC with automated checking in the loop (Text2BIM with Solibri; self-verification with IDS).

Work learning from real IFC stops at rung 3, and rungs 5-6 are reached only without learning from real models.

The missing piece for your topic is the decoder from a predicted graph back to IFC: types, profiles, openings and relationships. To be clear, this is my reading of the gap; none of these papers states it this way. It looks like a concrete thesis contribution. The self-verification paper's IDS loop looks reusable as the checking stage.

### Gaps
- I found no paper reporting a validity rate, meaning the share of generated models that pass a schema check, for a generative model trained on IFC.

## How do they evaluate that generated models are realistic or usable?

### Takeaway
Evaluation is weak and mostly local: per-node accuracy, loss, visual inspection, a small usability survey. None of the learned models reports a building-level realism or validity metric, and the ICD authors say so themselves.

### Cited Findings
- ICD classification [FT]: 79.26% node-type accuracy against 71.14% for the same network without message passing or GRU — [Renner et al. 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914).
- ICD geometry [FT]: mean vertex distance of about 22 m with unknown position and about 15 m with known position. The authors call a 22 m error "conventionally considered poor" and fall back on visual inspection — [Hornung et al. 2025, p. 880](https://doi.org/10.25442/hku.29365832).
- ICD usability [FT]: SUS scores of 56.25 (Restricted), 53.75 (Fully Autonomous) and 51.875 (Partial), all in the "OK" band, from 20 participants of whom 19 were architecture students. In the two more autonomous modes, participants struggled because of overly simplistic predictions and completion relied on user corrections — [Renner et al. 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914).
- ICD validity threat [FT]: validation subgraphs come from the same IFC models as training ones, and the authors acknowledge possible data leakage and say unseen models would be more robust. They also report narrow-range predictions ("overgeneralization") and the absence of "qualitative and objective architectural evaluation metrics" — [Renner et al. 2025](https://journals.sagepub.com/doi/full/10.1177/14780771251354914).
- Building-Graph-AI [EX]: reconstruction loss plus room accessibility, above 75% in the regular-entrance cases I read; expert assessment is left to future work — [Liang et al. 2025](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download). The precursor reports an average test loss of 0.098 for the best encoding — [CAADRIA 2024](https://papers.cumincad.org/data/works/att/caadria2024_386.pdf).
- Building-GNN [EX]: voxel accuracy, IoU, FID and constraint satisfaction — [Zhong et al. 2023](http://papers.cumincad.org/data/works/att/ecaade2023_166.pdf).
- Fuchs & Borrmann [EX]: masked-property prediction. For ifcJSONv5* with one masked space, I read 58.96 for all properties against 43.52 for EXPRESS. The table headers were damaged in extraction, so check the table before citing. The authors warn many correct values come from "repetition and regularity within IFC models" — [Fuchs & Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf).
- LLM side:
  - Text2BIM used 25 test prompts, Solibri-based issue counts and expert scoring; two of three LLMs solved about 70% of detected issues by the final pass — [Text2BIM](https://arxiv.org/pdf/2408.08054). [EX]
  - BIM-Edit scores geometry, semantics and topology through an IFC diff against manually authored ground truth; the best of seven models reached 49.48 of 100 — [BIM-Edit](https://arxiv.org/pdf/2606.20146). [EX]
  - BIBIMBAP has 100 tasks with test scripts including IFC integrity constraints; the best model reached 50.2%, and it uses deliberately small models — [BIBIMBAP](https://ec-3.org/wp-content/uploads/2026/08/EC32026_271.pdf). [EX]

### Inferences
- The 79% accuracy is probably optimistic for new buildings because of the same-model validation split and oversampling. This is my inference; the authors raise the risk but do not quantify it.
- Benchmarks from the LLM side (BIM-Edit, BIBIMBAP) currently offer better-defined IFC-level scoring than the graph-generation work. A thesis could borrow them. It could also add distribution metrics of the kind GraphRNN popularised, a schema check, IDS checks and building-level hold-out. That combination is my proposal; I found no paper using it.

### Gaps
- I found no study in which practising architects judged whole generated BIM models from a model trained on real IFC.

## LLM-based IFC generation as contrast: do they learn from decomposed real models?

### Takeaway
No. The Text-to-BIM systems work from prompts, tools and APIs without training on real models. The two exceptions fine-tune on real BIM but do not generate building models: Qwen-BIM produces text answers, and Fuchs & Borrmann fill in missing property values.

### Cited Findings
- **Text2BIM** [EX]: multiple agents write code against BIM authoring APIs "without the need for fine-tuning", with knowledge coming from prompts and a rule-based checker — [Du et al.](https://arxiv.org/pdf/2408.08054).
- **Self-verification** [EX]: the proof of concept is one prompt, GPT-5.2 and five refinement cycles. The authors state a comprehensive evaluation is still required — [Sesterhenn et al. 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_444.pdf).
- **MCP4IFC** [EX]: tools plus code generation with RAG. Future work explicitly suggests "training models with better exposure to well-structured IFC data" — [Nithyanantham et al. 2025](https://arxiv.org/pdf/2511.05533).
- **BIM-Edit** [EX]: a benchmark of editing, not creation from scratch: 324 tasks over 11 realistic models and 36 synthetic scenes, run through one IfcOpenShell code tool. Off-the-shelf models were evaluated — [BIM-Edit](https://arxiv.org/pdf/2606.20146).
- **Qwen-BIM (the "Lin et al." lead)** [EX]: Revit models of several building types were partitioned into spatial blocks and textualised, giving 3,493 pairs (2,129 QA, 1,364 QRA) for LoRA fine-tuning. It reports a 21.0% average G-Eval gain over the base model. It evaluates text answers, and I found no IFC or model generation in it — [Lin et al. 2026](https://arxiv.org/pdf/2602.20812).
- **Fuchs & Borrmann** [EX]: the closest language-model analogue. It runs continued pre-training of ModernBERT and Qwen2.5-Coder on 422 student IFC models (338/42/42 split), with geometry removed even though it is over three-quarters of file size. Task: infer missing properties — [Fuchs & Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf).
- **BIMgent** [EX]: drives authoring software through its GUI, with a 32% operation success rate and no mention of IFC in the extracted text — [Deng et al. 2025](https://arxiv.org/pdf/2506.07217).

### Inferences
- Both camps fail differently. Learned graph models capture patterns but cannot write valid files, while LLMs write files but have not learned from real practice and lose semantics. A hybrid is a plausible opening: a graph model trained on decomposed IFC proposes elements, and deterministic IfcOpenShell code plus IDS checks write and verify them. That is my proposal, not a published result I could find.
- Fuchs & Borrmann's 422 models are about 19 times the ICD corpus, but they are student work, not office projects. That trade-off is relevant to the data researcher.

### Gaps
- I found no paper that fine-tunes an LLM on decomposed real IFC to generate new whole IFC models. Two targeted searches returned nothing.

## Are there parametric or synthetic IFC generators used to create training data?

### Takeaway
Yes, but true IFC-writing generators are rare and very simple. The EG-ICE 2025 load-flow paper is real and uses IfcOpenShell, but only with columns and slabs. It also predicts connections rather than generating models.

### Cited Findings
- **Nabrotzky 2025 (the EG-ICE lead)** [EX]: synthetic IFC models with controlled parameters were built in IfcOpenShell, with injected errors (scaled slabs, changed column heights, omitted elements). Only IfcColumn and IfcSlab are present. A GNN classifies edges to reconstruct load flow — [Nabrotzky 2025](https://strathprints.strath.ac.uk/93299/13/Nabrotzky-EG-ICE-2025-Graph-neural-networks-for-structural-engineering.pdf).
- Its results need caution [EX]: GAT and GraphSAGE report accuracy 90.03%, precision 33.29%, recall 100%, F1 89.51%. A precision of 33.29% with recall of 100% gives F1 of about 50% by the standard formula, so the reported F1 needs another explanation, such as a different averaging. Rule-based converters reach up to 100% on these simple models, and the author says the comparison is of limited significance — [Nabrotzky 2025](https://strathprints.strath.ac.uk/93299/13/Nabrotzky-EG-ICE-2025-Graph-neural-networks-for-structural-engineering.pdf).
- **Seelos 2019** [AB]: C# and XBIM generation of IFC models — [mediaTUM record](https://mediatum.ub.tum.de/1524969).
- **ResBIM** [EX]: neural layouts plus Revit API produce over 1,000 RVT and plan pairs, and it is explicitly a synthetic dataset aimed at 2D-to-BIM. It also contrasts IFC-based, parametric and API routes for BIM generation — [Liang, Yabuki, Fukuda](https://ir.library.osaka-u.ac.jp/repo/ouka/all/103515/AutomConstr_181_106584.pdf).
- **Non-IFC parametric data:** [Building-GNN](http://papers.cumincad.org/data/works/att/ecaade2023_166.pdf) (voxels), [Bauscher 2024](https://papers.cumincad.org/data/works/att/caadria2024_128.pdf), and [Dalach et al. 2025](https://strathprints.strath.ac.uk/93246/13/Dalach-etal-EG-ICE-2025-Exploring-building-energy-performance-prediction-using-graph.pdf), whose 1,176 synthetic buildings are energy-model graphs for prediction. [EX]
- Hornung et al. explicitly chose real models over synthetic ones and state most prior studies use synthetic or simplified data — [Hornung et al. 2025, p. 872](https://doi.org/10.25442/hku.29365832). [FT]

### Inferences
Synthetic IFC could bootstrap a decoder that turns graphs into valid IFC, because the ground truth is known exactly. Nabrotzky's near-perfect rule-based result suggests synthetic data may be too clean to teach what makes real models hard. Both points are my reading.

### Gaps
- Nabrotzky's total model count was not captured in my excerpts. The confusion matrix suggests about 246,000 evaluated edges, but check the paper.

## Paper register: citation, verified PDF, licence and relevance

### Takeaway
Read Hornung et al. and Renner et al. first, then Fuchs & Borrmann, MCP4IFC and the self-verification paper. All recommended papers have a legal PDF route except Seelos, which has none I could find. No pirate sources were used.

### Cited Findings

PDF check legend:
- **curl**: scripted download returned HTTP 200 and the file began with `%PDF`.
- **browser**: the publisher blocks scripts, but a normal browser session returned or rendered the PDF.

**Core: learning from real or BIM-derived data**

| Title | Authors | Year, venue | DOI / ID | PDF (check) | Licence | Relevance, reason | Read |
|---|---|---|---|---|---|---|---|
| Training and evaluating a Co-pilot tool using graph neural networks for generating non-orthogonal building typologies in architectural autocompletion | Markus Renner, Matthias Hornung, Diellza Elshani, Mathias Niepert, Thomas Wortmann | 2025, IJAC 23(3):775-795 | [10.1177/14780771251354914](https://doi.org/10.1177/14780771251354914) | [PDF](https://journals.sagepub.com/doi/pdf/10.1177/14780771251354914) (browser: 200, `application/pdf`, 1.9 MB; curl gets 403) | CC BY 4.0 | **High**: decomposes real IFC into subgraphs and generates elements incrementally, but stops short of IFC. | [FT] |
| Augmenting IFC-Based BIM Models for Graph Neural Network Training of Non-Orthogonal Spatial Typologies: A Context-Informed Design Methodology | Matthias Hornung, Markus Renner, Diellza Elshani, Mathias Niepert, Thomas Wortmann | 2025, CAAD Futures 2025 Vol. II, pp. 869-883 | [10.25442/hku.29365832](https://doi.org/10.25442/hku.29365832) | [PDF](https://ndownloader.figshare.com/files/55632518) (browser: renders in the HKU viewer as `paper457.pdf`, 13.34 MB; curl gets a WAF challenge) | CC BY-NC 4.0 | **High**: the most detailed published recipe for decomposing real IFC into a generative training set. | [FT] except p. 3 |
| A Framework for generating building models for graph-based neural networks | Seelos, S. (given name not in record) | 2019, TUM report | [mediaTUM 1524969](https://mediatum.ub.tum.de/1524969); no DOI found | **No open PDF found** | Not stated | **High if obtainable**: the only abstract joining an IFC writer with GraphGAN/GraphRNN, though results are unknown. | [AB] |
| Towards Semantic Enrichment of IFC Models through Language Modeling | Stefan Fuchs, André Borrmann | 2025, EG-ICE 2025 | [10.17868/strath.00093271](https://doi.org/10.17868/strath.00093271) | [PDF](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf) (curl) | CC BY 4.0 | **Medium**: transformers trained on real IFC text, but infilling properties rather than generating models. | [EX] |
| Building-graph-AI: Graph neural networks learning and generating 3D detailed and layered building models | Jiadong Liang, Ximing Zhong, Shixin Zhao, Pia Fricker, Immanuel Koh | 2025, IJAC 23(3):640-654 | [10.1177/14780771251352946](https://doi.org/10.1177/14780771251352946) | [Post-print](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download) (curl) | Post-print CC BY-NC-ND | **Medium**: gives a BIM-element encoding and a Revit rebuild, but on floor-plan-derived data. | [EX] |
| Bridging BIM and AI: A Graph-BIM Encoding Approach for Detailed 3D Layout Generation Using Variational Graph Autoencoder | Jiadong Liang, Ximing Zhong, Immanuel Koh | 2024, CAADRIA, 1:221-230 | [10.52842/conf.caadria.2024.1.221](https://doi.org/10.52842/conf.caadria.2024.1.221) | [PDF](https://papers.cumincad.org/data/works/att/caadria2024_386.pdf) (curl) | Not stated | **Medium**: precursor of the above, with the same limits. | [EX] |
| Fully automated synthetic BIM dataset generation using a deep learning-based framework | Xing Liang, Nobuyoshi Yabuki, Tomohiro Fukuda | Online 2025, Automation in Construction 181 (2026), 106584 | [10.1016/j.autcon.2025.106584](https://doi.org/10.1016/j.autcon.2025.106584) | [PDF, Osaka repository](https://ir.library.osaka-u.ac.jp/repo/ouka/all/103515/AutomConstr_181_106584.pdf) (curl) | CC BY per Unpaywall | **Medium**: a neural-to-BIM generator, but synthetic and RVT rather than IFC. | [EX] |
| Graph Neural Networks for Structural Engineering: Improving BIM Workflows and IFC Model Exchange | Toni Nabrotzky | 2025, EG-ICE 2025 | [10.17868/strath.00093299](https://doi.org/10.17868/strath.00093299) | [PDF](https://strathprints.strath.ac.uk/93299/13/Nabrotzky-EG-ICE-2025-Graph-neural-networks-for-structural-engineering.pdf) (curl) | CC BY 4.0 | **Medium**: a parametric IFC generator recipe, with connection prediction only. | [EX] |
| Learning and Generating Spatial Concepts of Modernist Architecture via Graph Machine Learning | Erik Bauscher, Anni Dai, Diellza Elshani, Thomas Wortmann | 2024, CAADRIA, 1:159-168 | [10.52842/conf.caadria.2024.1.159](https://doi.org/10.52842/conf.caadria.2024.1.159) | [PDF](https://papers.cumincad.org/data/works/att/caadria2024_128.pdf) (curl) | Not stated | **Low**: a graph autoencoder on remodelled houses, with no IFC. | [EX] |
| Exploring the latent space distribution of a graph autoencoder trained on 3D models of modernist architecture | Erik Bauscher, Thomas Wortmann | 2025, IJAC 23(3):742-752 | [10.1177/14780771251353797](https://doi.org/10.1177/14780771251353797) | Open access per OpenAlex; **PDF not checked**, no direct URL verified | CC BY-NC 4.0 | **Low**: shows how data generation shapes the latent space, without BIM. | [AB] |
| Building-GNN: Exploring a co-design framework for generating controllable 3D building prototypes by graph and recurrent neural networks | Ximing Zhong, Immanuel Koh, Pia Fricker | 2023, eCAADe, 2:431-440 | [10.52842/conf.ecaade.2023.2.431](https://doi.org/10.52842/conf.ecaade.2023.2.431) | [PDF](http://papers.cumincad.org/data/works/att/ecaade2023_166.pdf) (curl) | Not stated | **Low**: rule-based voxel data only. | [EX] |
| Interactive AI for Generative Housing Design Based on Graph Neural Networks and Deep Generative Models | Tian Xia, Alex Ledbetter, Alexandru Bobe, Jeroen Hofland, Berend Krouwels, Tong Wang, Luciano Cavalcante Siebert, Paul Chan, Jian Yang | 2024, EC3 | [10.35490/ec3.2024.188](https://doi.org/10.35490/ec3.2024.188) | [PDF](https://ec-3.org/wp-content/uploads/2025/10/EC32024_188.pdf) (curl) | Not stated | **Low**: a DGMG precedent on floor plans. | [EX] |
| AIPDORCS: Artificially Intelligent Preliminary Design of Reinforced Concrete Structures | Alon David Argaman, Rafael Sacks | 2024, EC3 | [10.35490/ec3.2024.298](https://doi.org/10.35490/ec3.2024.298) | [PDF](https://ec-3.org/wp-content/uploads/2025/10/EC32024_298.pdf) (curl) | Not stated | **Low**: classification over BIM graphs, not generation. | [EX] |
| Generative AIBIM: An automatic and intelligent structural design pipeline integrating BIM and generative AI | Zhili He, Yu-Hsing Wang, Jian Zhang | 2025, Information Fusion 114, 102654 | [10.1016/j.inffus.2024.102654](https://doi.org/10.1016/j.inffus.2024.102654); arXiv:2311.04052 | [arXiv PDF](https://arxiv.org/pdf/2311.04052) (curl) | arXiv CC BY-SA 4.0 | **Low**: diffusion on 2D drawings, with no IFC. | [EX] |

**Contrast: LLM-based**

| Title | Authors | Year, venue | DOI / ID | PDF (check) | Licence | Relevance, reason | Read |
|---|---|---|---|---|---|---|---|
| Text2BIM: Generating Building Models Using a Large Language Model-based Multi-Agent Framework | Changyu Du, Sebastian Esser, Stavros Nousias, André Borrmann | 2026, J. Computing in Civil Engineering 40(2), 04025142; preprint 2024 | [10.1061/JCCEE5.CPENG-6386](https://doi.org/10.1061/JCCEE5.CPENG-6386); arXiv:2408.08054 | [arXiv PDF](https://arxiv.org/pdf/2408.08054) (curl) | arXiv CC BY-NC-SA 4.0 | **Medium**: strong model for the checker loop, but learns nothing from real models. | [EX] |
| A Self-Verification Framework Toward Reliable Text-to-BIM Generation | Tobias Sesterhenn, Bharathi Kannan Nithyanantham, Stefan Lüdtke, Christian Bartelt | 2026, EC3 | [10.35490/EC3.2026.444](https://doi.org/10.35490/EC3.2026.444) | [PDF](https://ec-3.org/wp-content/uploads/2026/08/EC32026_444.pdf) (curl) | Not stated | **Medium**: the closest template for validating generated IFC with IDS. | [EX] |
| MCP4IFC: IFC-Based Building Design Using Large Language Models | Bharathi Kannan Nithyanantham, Tobias Sesterhenn, Ashwin Nedungadi, Sergio Peral Garijo, Janis Zenkner, Christian Bartelt, Stefan Lüdtke | 2025, preprint | arXiv:2511.05533 | [PDF](https://arxiv.org/pdf/2511.05533) (curl) | CC BY-NC-SA 4.0 | **Medium**: documents precisely what breaks when IFC is generated without training. | [EX] |
| BIM-Edit: Benchmarking Large Language Models for IFC-Based Building Information Modeling | Bharathi Kannan Nithyanantham, Clemens Kujat, Tobias Sesterhenn, Stefan Telgmann, Ashwin Nedungadi, Jörn Plönnigs, Christian Bartelt, Stefan Lüdtke | 2026, preprint | arXiv:2606.20146 | [PDF](https://arxiv.org/pdf/2606.20146) (curl) | CC BY-SA 4.0 | **Medium**: reusable scoring of IFC geometry, semantics and topology. | [EX] |
| BIBIMBAP: A Benchmark for Instructional BIM-Based Automated Programming | Clemens Kujat, Bharathi Kannan Nithyanantham, Stefan Telgmann, Tobias Sesterhenn, Jörn Plönnigs, Stefan Lüdtke, Christian Bartelt | 2026, EC3 | [10.35490/ec3.2026.271](https://doi.org/10.35490/ec3.2026.271) | [PDF](https://ec-3.org/wp-content/uploads/2026/08/EC32026_271.pdf) (curl) | Not stated | **Low**: small test models and atomic tasks. | [EX] |
| Qwen-BIM: developing large language model for BIM-based design with domain-specific benchmark and dataset | Jia-Rui Lin, Yun-Hong Cai, Xiang-Rui Ni, Shaojie Zhou, Peng Pan | 2026, preprint | arXiv:2602.20812 | [PDF](https://arxiv.org/pdf/2602.20812) (curl) | CC BY-NC-ND 4.0 | **Medium**: it does decompose real BIM for training, but outputs text, not models. | [EX] |
| BIMgent: Towards Autonomous Building Modeling via Computer-use Agents | Zihan Deng, Changyu Du, Stavros Nousias, André Borrmann | 2025, preprint | arXiv:2506.07217 | [PDF](https://arxiv.org/pdf/2506.07217) (curl) | CC BY-NC-SA 4.0 | **Low**: GUI automation, no learning from models and no IFC. | [EX] |

**Adjacent (belongs mainly to other researchers)**

| Title | Authors | Year, venue | ID | PDF (check) | Licence | Relevance, reason | Read |
|---|---|---|---|---|---|---|---|
| Exploring link prediction on multidisciplinary BIM graphs using graph neural networks | Abdallah Shoaip (supervisor Zijian Wang, examiner André Borrmann) | M.Sc. thesis, TUM, submitted December 2025 | [mediaTUM doc 1841525](https://mediatum.ub.tum.de/doc/1841525/document.pdf); no DOI found | PDF above (browser: 200, `application/pdf`, 102 pages; curl gets a bot check) | Not checked | **Low-medium**: predicts missing links between real IFC disciplines and tests on unseen projects, but generates nothing. | [AB], plus abstract in PDF |
| Exploring Building Energy Performance Prediction Using Graph Neural Networks | Agata Dalach, Zijian Wang, Stavros Nousias, André Borrmann | 2025, EG-ICE 2025 | [10.17868/strath.00093246](https://doi.org/10.17868/strath.00093246) | [PDF](https://strathprints.strath.ac.uk/93246/13/Dalach-etal-EG-ICE-2025-Exploring-building-energy-performance-prediction-using-graph.pdf) (curl) | CC BY 4.0 | **Low**: synthetic graphs for prediction, not generation. | [EX] |

### Inferences
- The paper count on the "real IFC, generative" row is effectively two papers from one group using one 22-file corpus. A thesis in this space would be directly comparable to them, and improving on building-level hold-out, IFC output and validation looks feasible. This is my judgement, not a claim from a source.

### Gaps
- Licences marked "Not stated" mean I did not find a licence statement in what I read; they are not confirmations of any particular terms.
- I excluded papers I could not read, including several that appeared only in search snippets: Text2Structure3D (arXiv:2601.12870), "Generating BIM model from structural and architectural plans using Artificial Intelligence" and "Intelligent beam layout design for frame structure based on graph neural networks". They may be worth a look but are unassessed.
- Claims tagged [EX] come from targeted excerpts, so an absence such as "no schema check found" is weaker than for [FT] papers. For the two [FT] ICD papers, absence of IFC export and of checkers rests on reading the whole text, except Hornung p. 3.
