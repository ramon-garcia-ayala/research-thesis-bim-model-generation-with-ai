# Revit-native decomposition and reconstruction, and serialising BIM as text for AI

Notes checked on 2026-11-08. These notes do not repeat `ifc_decomposition.md` or `ifc_generation.md`; they cite those files where a fact is already recorded there.

**Verification tags**

- **[FT]** I read the whole extracted text, except the references.
- **[EX]** I read the PDF's abstract plus targeted sections and keyword hits. A statement that something is absent from an [EX] paper is weaker than the same statement for an [FT] paper.
- **[AB]** Abstract, repository record or project page only.
- **[SN]** Search snippet or summary only. Treat as unverified.
- **[DOC]** Official Autodesk page that I fetched and read.
- **PDF check** means my script got HTTP 200 and a file starting with `%PDF-` on 2026-11-08.

## Which works extract from Revit and rebuild in Revit? Are arXiv 2304.11672 and CBIM the same work?

### Takeaway
Yes, they are the same work: arXiv 2304.11672 is the paper titled "CBIM: A Graph-based Approach...". It is also the only reviewed work that takes an existing Revit model out, through a graph, and back into Revit, and it proves little: one apartment, four object classes, a manual check, and no account of how families were supplied. I found no text-based Revit round trip and no paper that reports a numeric fidelity score for any Revit round trip.

### Cited Findings

**Identity of the work**
- arXiv 2304.11672 is "CBIM: A Graph-based Approach to Enhance Interoperability Using Semantic Enrichment" by Zijian Wang, Huaquan Ying, Rafael Sacks and André Borrmann, submitted 2023-04-23. The arXiv record has no journal reference, and I found no journal version [AB] — [arXiv PDF](https://arxiv.org/pdf/2304.11672).
- "CBIM" is also the name of the funding project (Cloud-based Building Information Modelling, EU grant 860555), so "Wang et al. 2023" is ambiguous [FT] — [Wang et al. 2023](https://arxiv.org/pdf/2304.11672).
- A different paper shares the label: "CBIM: object-level cloud collaboration platform for supporting across-domain asynchronous design" (Wang, Ouyang, Sacks, arXiv 2303.03854). It sends reference geometry between disciplines and is not a rebuild [EX] — [Wang et al. 2023b](https://arxiv.org/pdf/2303.03854). Cite by title.
- Refinement to `ifc_decomposition.md`: Revit 2019 is the source of the 32-apartment classifier dataset. The round-trip case is a separate step, from Revit 2023 to Revit 2022 [FT] — [Wang et al. 2023](https://arxiv.org/pdf/2304.11672).

**CBIM 2304.11672, read in full [FT]** — all items below from [the paper](https://arxiv.org/pdf/2304.11672)
- Pipeline:
  - "Pure object geometries" are exported through Dynamo as one PLY mesh per object in global coordinates.
  - A random forest with 19 geometric features predicts one of four classes: wall, floor, window, door.
  - Rules on bounding boxes and exact distance assign `cbim:hosting`, `cbim:hosted` or `cbim:adjacentTo`.
  - Dimensional attributes are computed from geometry and class.
  - A Dynamo "Reconstructor" reads the RDF graph and creates elements in Revit 2022.
- How consistency was measured: "We performed a manual comparison of each object pair across the two different Revit models. We found that the location, dimensions, and object types matched." There is no numeric score, tolerance or object count for the case model, and only one apartment was rebuilt.
- What the paper says changed or is missing:
  - Object IDs changed, "as this process focuses on reconstructing models rather than duplicating information".
  - The graph lacks spatial structure (site, building, levels).
  - The graph lacks space objects.
- What the method discards by design: the input is geometry alone, so every native parameter, material and name is dropped at export. Only class, hosting and adjacency, and dimensions come back, and they are inferred.
- Families and types: the word "family" does not occur in the extracted text (keyword check). The only related statement is that a window "needs the hosted object, the window type, and the window's central point". The paper does not say where the window type comes from, or how types were made available in Revit 2022. "Object types matched" could mean class or Revit type; the paper does not distinguish.
- Hosted elements are the best-handled part: the Reconstructor reads the window, follows the explicit `cbim:hosted` edge to its wall, computes the centre point and places it. Relationship rules score accuracy and F1 of 0.99 on test data.
- Classifier: decision tree and random forest reach 100% on validation and test, on a random 7:1:2 split of 1,484 de-duplicated objects from 32 apartments. Whether the case apartment was in that dataset is not stated.
- The authors say object generation remains unexplored and call the setting "not overly complex", at the initial design stage.

**Other works that touch Revit on both sides**
- Building-Graph-AI (Liang et al. 2025) exports through Dynamo to two Excel files (node features; edge index and attributes), using Revit element IDs, and "the predicted edge class can be rebuilt in Revit with detailed building components". The training models are House-GAN plans remodelled in Revit, not office models [EX] — [Liang et al. 2025](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download).
  - "Famil*" and "IFC" have zero hits in the extracted text. Walls are edges with a wall-type attribute, and the authors say the data lack more detailed components [EX].
- ResBIM (Liang, Yabuki, Fukuda 2025) only writes, it does not extract. A C# DLL in Revit 2024 reads a four-channel image and maps it to components. A window is created by filtering `FamilySymbol` by category with `FilteredElementCollector`, picking an entry such as "Windows_Sgl_Plain 1360 × 1210 mm", and calling `NewFamilyInstance`. It relies on a custom component library [EX] — [Liang et al. 2025b](https://ir.library.osaka-u.ac.jp/repo/ouka/all/103515/AutomConstr_181_106584.pdf).
- A Big Data Approach to BIM Models (Beorkrem et al. 2020) writes parameters back into Revit through pyRevit, but does not rebuild elements [EX] — [ACSA 2020](https://www.acsa-arch.org/proceedings/Annual%20Meeting%20Proceedings/ACSA.AM.108/ACSA.AM.108.120.pdf).
- CBIM platform (2303.03854) stores BOT graph nodes with original Revit attribute names, plus PLY geometry named by GUID. It cites MINDOC, a Revit add-in that compiles LBD graphs and is "not open for public use" [EX] — [Wang et al. 2023b](https://arxiv.org/pdf/2303.03854).
- Engineering practice, not research: Speckle sends Revit data to its server and back. A user reports that in a Revit-to-Revit test they "couldn't get all the elements to come through" and asks for DirectShape fallback, and a respondent answers that a setting exists — [Speckle forum, 2024](https://speckle.community/t/revit-to-revit-using-speckle/9612). This is an anecdote with no measurement.

**What each one proves about round-trip fidelity**

| Work | Out of Revit | Middle form | Back into Revit | How checked | What it proves |
|---|---|---|---|---|---|
| CBIM 2304.11672 | Dynamo, PLY | RDF graph | Dynamo, Revit 2022 | Manual, object pairs, 1 apartment | Location, dimensions and class can survive for 4 classes. Nothing on parameters, materials, levels or family identity |
| Building-Graph-AI | Dynamo, Excel | Graph on a grid | "Rebuilt in Revit" | Loss and room accessibility (see `ifc_generation.md`) | A grid-regular wall and column layout can be regenerated. Not a fidelity test of a real model |
| ResBIM | None | Image | Revit API, Revit 2024 | Not found in my excerpts | Writing via `NewFamilyInstance` scales to 1,000+ models (count from `ifc_generation.md`) when a prepared library exists |
| Beorkrem 2020 | pyRevit, MongoDB | NoSQL documents | Parameter edits only | Prototype | Parameter write-back only |
| Speckle | Connector | JSON-like objects | Connector | None | Incomplete in at least one reported case |

### Inferences
- CBIM's "consistent" means geometric and class consistency at early design level. It does not mean the same Revit model, and I would not cite it as evidence of lossless round trip.
- Its design is the opposite of the proposed first test. CBIM throws away native data and re-infers it. A thesis with direct API access can keep family name, type name, host ID and parameters, so the first test should beat CBIM easily on identity while being far harder on completeness.
- No text form sits in any of these loops. A Revit to text to Revit test on a real model, with a scored comparison, appears to be unpublished, within the limits of my searches.

### Gaps
- I do not know how the CBIM Reconstructor obtained window types. The Dynamo code is shown only as a partial figure, and I found no code repository in the paper.
- The word "manual" is the only description of the CBIM check, so tolerances cannot be reconstructed.
- I found no paper on round trip of Revit worksets, phases, groups, in-place families or design options.

## Which works derive ML datasets directly from Revit through the API, not through IFC?

### Takeaway
The lead is real: Andrukhov and Potekha 2025, in Ukrainian, with an open PDF. It is a schema and protocol paper with no reported results in the extracted text, and its field list could not rebuild a model. Stronger examples of the Revit-direct route are BIGNet (Revit API to graphs) and Geç and Güzelci (Revit schedules across three typologies).

### Cited Findings

**The lead: Формування набору даних BIM-моделі для задач машинного навчання (Formation of BIM model dataset for machine learning tasks) [FT, Ukrainian]**
- The hebis page returned an anti-bot challenge to my script, so I verified the paper through its DOI 10.31649/2311-1429-2025-1-87-94 and journal page. The OpenAlex abstract matches the lead's wording [AB] — [journal page](https://doi.org/10.31649/2311-1429-2025-1-87-94).
- Four export routes: Schedules to CSV; Dynamo to CSV, XLSX or JSON; pyRevit or Revit API to CSV, JSON or XLSX; IFC to Autodesk Platform Services or Speckle to JSON or CSV — [Andrukhov and Potekha 2025](https://stmkvb.vntu.edu.ua/index.php/stmkvb/article/download/947/875).
- `Elements.csv` fields: DocumentGUID, ModelVersion, ExportTimestampUTC, ElementUniqueId, IfcGUID, Category, Family, Type, InstanceOrType, Level, Phase, Area_m2, Volume_m3, Thickness_m, CentroidX/Y/Z_m, PrimaryMaterial, IsDeleted — [same](https://stmkvb.vntu.edu.ua/index.php/stmkvb/article/download/947/875).
- Useful warnings: exporting "as is" gives gaps, duplicates, unstable keys ("for example, changes of UniqueId on copying") and loss of context (phase, system, room-storey link). It recommends splitting by level, document or type to prevent leakage, and a dual form of flat core plus ParamJSON — [same](https://stmkvb.vntu.edu.ua/index.php/stmkvb/article/download/947/875).
- Limit: the abstract speaks of a baseline mass prediction and says data discipline reduces leakage and improves reproducibility. Keyword checks for MAE, RMSE and R² found nothing, the text reports no number of models and no result figures, and scenarios are described rather than measured. Figures are images and I did not inspect them.

**Other Revit-direct datasets**
- BIGNet (Han, Lu, Lin 2025): implemented with Python 3.9 and the Revit API, about five minutes per floor, each floor one graph. Family and FamilySymbol names are text-embedded with M3E to 64 dimensions each. Corpus sizes are in `ifc_decomposition.md` [EX] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104).
- Geç and Güzelci 2026: door data "extracted from Revit schedules" into tables, 5,763 doors from three office-authored Revit projects. About 35% of hospital records and 17% of recreational facility records were removed in preprocessing [EX] — [Geç and Güzelci 2026](https://www.itcon.org/papers/2026_25-ITcon-Ge%C3%A7.pdf).
- Beorkrem et al. 2020: pyRevit to MongoDB, on an archive of about 300 design models from one firm, focused on rooms and room tags. Machine learning is only a prospective use. They report "Family parameters and naming conventions vary widely even with the most rigorous of firm standards" [EX] — [ACSA 2020](https://www.acsa-arch.org/proceedings/Annual%20Meeting%20Proceedings/ACSA.AM.108/ACSA.AM.108.120.pdf).
- Harode and Thabet 2023: iConstruct, Dynamo and Talend extract clash data from federated models [AB] — [EPiC 2023](https://easychair.org/publications/paper/fNwz/download).
- Qwen-BIM uses Revit models as its source, though the passages I read do not name the extraction tool [EX] — [Lin et al. 2026](https://arxiv.org/pdf/2602.20812).

### Inferences
- `Elements.csv` has no host ID, location curve, orientation, or any relation between elements. Centroids of bounding boxes cannot place a wall or a hosted door. It is a table for prediction, and a round trip needs a richer schema. This is my reading of the field list.
- Beorkrem's warning bears directly on the assumption that the lakes "mostly follow standards". Expect a naming normalisation step, and measure the real standard compliance before relying on it.

### Gaps
- I found no paper describing a Revit API dataset built with reconstruction in mind.
- No paper I read reports the attrition rate of opening and exporting a large RVT archive headlessly.
- Revit-to-tabular tools surfaced in search (xeokit xeoRVT, BIM Open Schema, DataDrivenConstruction RvtExporter), but I read only search summaries [SN], so I do not recommend them here.

## Which works serialize BIM as text for language models, and which text form works? Is raw IFC text compared with structured element-and-relation text?

### Takeaway
Only two works I could identify compare text forms directly, and I could read only one. Fuchs and Borrmann show that the winner depends on the task: an element-centred JSON with attached properties beats STEP by about 15 points on local infill, but STEP beats it when all spaces are masked. Qwen-BIM and ASK-BIM do not compare forms; ASK-BIM's case against raw IFC is an unmeasured anecdote.

### Cited Findings

**Fuchs and Borrmann 2025: the only comparison I read in the paper [FT]**
- Data: 422 student IFC models of office and residential buildings, 92.7% authored in Revit, split 338/42/42 by model. Tested with ModernBERT at 8,192 tokens, 30% random masking — [Fuchs and Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf).
- Table 3, read from the rendered page because the text layer is garbled (this resolves the doubt flagged in `ifc_generation.md`). Accuracy in %:

| Representation | All spaces: all | name | others | One space: all | name | others |
|---|---|---|---|---|---|---|
| EXPRESS, no geometry | 16.91 | 2.86 | 24.45 | 43.52 | 41.39 | 46.49 |
| EXPRESS, no special tokens | 18.96 | 4.97 | 25.62 | 44.3 | 43.77 | 47.33 |
| EXPRESS + geometry | **23.44** | 1.12 | **32.46** | 29.51 | 3.57 | 36.09 |
| ifcJSONv5 | 13.23 | 2.02 | 18.31 | 45.37 | 17.47 | 53.82 |
| ifcJSONv5* | 13.37 | **10.85** | 18.27 | **58.96** | **66.41** | **61.37** |

- The form that wins: ifcJSONv5* drops redundant property sets, attaches properties and quantities directly to the element, replaces GUIDs with semantic IDs such as `space_1`, and keeps relations as references (`decomposes`, `isTypedBy`), as Figure 2 shows.
- It is not the most compact. Average test size is 4.52 MB against 3.05 MB for EXPRESS without geometry and 13.84 MB for ifcJSONv5.
- The authors expected EXPRESS to lose and write "Somewhat unexpectedly" that EXPRESS won the all-masked baselines.
- Geometry: it is over three-quarters of file size. Keeping it gives the best all-spaces scores but crowds out neighbouring context, so one-space accuracy falls to 29.51.
- Warnings directly relevant to a round trip:
  - The changes "complicate lossless conversion back to the original IFC schema".
  - The IFC-to-ifcJSON converter already produced parsing errors.
  - Floats were rounded to two decimals.
  - A semantic-ID to GUID mapping is proposed as the bridge to the source model.
- Decoder comparison: Qwen2.5-Coder reaches at best 54.05% on one-space all-properties, about 5 points below ModernBERT. ModernBERT is told the masked token count, which leaks information. Mean float error is 231.55 against 6,161.54 for the best ModernBERT model in that scenario.
- Regularity caveat: many correct values come from "repetition and regularity within IFC models". Masking covers space properties only.

**Iversen et al. 2026 [AB]:** compares an LLM extraction system on IFC4.x against IFC5 and reports that "the JSON-based IFC5 format enables significantly more accurate and reliable data extraction". I could not read the numbers because the publisher returned a script challenge — [DOI](https://doi.org/10.1007/978-3-032-18226-5_8).

**Qwen-BIM (Lin et al. 2026) [EX]** — all items from [the paper](https://arxiv.org/pdf/2602.20812)
- "Semi-structured" text in three parts: Header Section, Component Header Section (attributes and units), Component Data Section in sentences. Example: "The ID of the 1st wall is 342693. Its starting point coordinate is (-1897, -5891, 0), and the ending point coordinate is (-1897, -3191, 0). The wall thickness is 200 mm, the wall height is 2900 mm, the wall length is 2700 mm, and its construction number is Q23."
- Irregular slabs are written as ordered corner coordinates.
- Decomposition: spatial blocks of 5 m or 8 m, about 10-15 components each, 150 blocks, 3,300 QA pairs: shopping mall 40 blocks, office 40, dormitory 30, teaching 20, museum 30. Block size was set by "manual experimentation", so partitioning is a length budget and not a design unit.
- Relations are not written as relations in the examples I read; adjacency must be inferred from coordinates.
- It tests one text form only. Answers come from hard-coded rules. Nothing is written back to Revit. Data are "available on request".
- Result: 21.0% average G-Eval gain over the base model, and more reasoning data gives better results.

**ASK-BIM (Ibba, Alonso, Reforgiato Recupero 2026) [EX]** — all items from [the paper](https://iris.unica.it/retrieve/a95197d4-ceb7-4f1e-808f-1e046a8fcc04/1-s2.0-S0169023X26000285-main.pdf)
- IFC goes to a knowledge graph through IFC-to-LBD at PROPS L3, then SPARQL generated by staged prompts. The LLM never receives the model as text.
- Evaluated on one IFC file, a 4-floor office building in Barcelona, with 28 questions: 16 correct, 3 partial, 9 incorrect, judged by three experts in full agreement.
- The raw-IFC claim is an unquantified remark in the introduction: DeepSeek "can only analyze approximately 1%" of a 10 MB file, and GPT-4o counts walls but cannot link their properties.
- "Baseline" has zero hits in the extracted text. The conclusion that the approach "leads to improved correctness" therefore has no control arm that I could find.

**Related evidence**
- Size of raw text: FZK-Haus "tokenizes to ≈1.7 million tokens" with the GPT-4o tokenizer [EX] — [IfcLLM](https://arxiv.org/pdf/2605.13236).
- Hellin et al. 2026: on 1,027 tasks over 37 IFC models from 21 projects, an agent that explores the model by running code beats static query generation across all configurations. A door width can appear as Width, Rough Width, NominalWidth or Breite [EX] — [Hellin et al. 2026](https://arxiv.org/pdf/2605.01698). This compares paradigms, not text forms.
- Jin et al. 2026: restructures IFC into JSON; LLMs do "reasonably" when data are explicitly structured, while spatial reasoning and subtle modifications remain hard [AB] — [record](https://scholar.korea.ac.kr/item/4edad026-d51a-4f33-9e45-a2ac11c6cd38).
- Ladrón de Guevara et al. (BIM-native tokenization, not text) [FT] — [arXiv 2512.04832](https://arxiv.org/pdf/2512.04832):
  - A door stores its supporting wall index, normalised position along that wall, width and family and swing attributes, the closest published analogue to Revit hosting I found.
  - Against text encoders run on serialized room text, it wins type clustering (NMI 0.726 vs 0.371) and loses within-type ranking (nDCG 68.2 vs 86.7).
  - The order of elements matters: changing it costs up to 12.3 coverage points.
  - The authors call a flat-serialization baseline "the next critical experiment", so structure versus flat text remains untested there.
  - The corpus is proprietary, and I saw no mention of Revit.
- Smirnov et al. 2026: a grammar derived from IDS restricts LLM output to schema-compliant Cypher, reaching 100% semantic compliance [EX] — [EC3 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_306.pdf). This points to constrained decoding as a way to keep generated text valid.

### Inferences
- There is no controlled test of raw IFC text against a designed element-and-relation text for a generation or reconstruction task. Fuchs is the nearest, and even its "EXPRESS" arm is cleaned (no GUIDs, rounded floats, usually no geometry), so it is not truly raw.
- Fuchs's pattern fits a plausible reading: element-centred text wins when local context fits in the window, and the more compact form wins when the task depends on seeing more of the file. So block size and text form should be tested together. This is my interpretation, not the authors'.
- The round-trip goal conflicts with the forms that score well, since Fuchs and Qwen-BIM both simplify in ways that lose information. Keeping a reversible master form with a stable ID, and deriving a lean learning view from it, resolves this and extends the two-layer idea in `ifc_decomposition.md`.
- The Qwen-BIM form and the ifcJSONv5* form are both defensible starting points for the thesis text. Neither carries Revit family and type identity in the examples I saw (Qwen's has a construction number; Fuchs's has `isTypedBy` as a reference).

### Gaps
- Numbers for IFC4.x against IFC5 in Iversen et al. Read it through a library or a normal browser.
- A summary surfaced in search says a study compared IFC with IfcOpenShell, JSON, SQL and a property graph with Cypher, and that accuracy did not differ significantly [SN]. It came from a LinkedIn post that I did not read, and I could not locate the paper, so it is not cited as evidence.
- I found no work serializing native Revit data with family, type and host fields as text for an LLM with a Revit write path.

## Does any work test masking or reconstruction, where parts of a BIM model are hidden and an AI restores them?

### Takeaway
Yes at property, node-feature and layout level, but no work I found masks real elements from real Revit models, restores them and writes them back. Building-Graph-AI is the closest in form, masking interior walls and rebuilding in Revit, but it uses plans converted to Revit rather than office models.

### Cited Findings

| Work | What is hidden | Data | Restored as | Score | Read |
|---|---|---|---|---|---|
| [Building-Graph-AI](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download) | Interior wall layout, keeping boundary and main entrance | House-GAN plans remodelled in Revit | Edge classes on a grid, then Revit | Loss, accessibility | [EX] |
| [Fuchs and Borrmann](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf) | Space property values, 30% random tokens in training | 422 student IFC, unseen test models | Text values | 58.96% best, one space | [FT] |
| [BIGNet](https://arxiv.org/pdf/2509.11104) | 50% of node features, plus three re-masked views at 50% | Revit API graphs | Features, as a pretext task | Scaled cosine error for training; judged by downstream F1 | [EX] |
| [Qwen-BIM](https://arxiv.org/pdf/2602.20812) | Erased construction number or fire rating; altered thickness or Z | Revit blocks as text | Text answers to "complete this data" and "propose a reasonable" value | G-Eval | [EX] |
| [BIM tokenization](https://arxiv.org/pdf/2512.04832) | Room contents given the envelope; masked tokens as an auxiliary encoder loss | Professional residential rooms, proprietary | Parametric, wall-hosted entities | Coverage 54.9 and navigability 14.6 in the controlled benchmark | [FT] |
| [BIM-JEPA](https://jackswl.github.io/bim-jepa/) | Patches inside one element's point cloud, predicted in latent space | 907,349 elements per project page | No reconstruction by design | Downstream classification | [AB] |
| [MaskLayout](https://doi.org/10.1016/j.autcon.2026.107120) | Dynamic masking of six room attributes | 43,000+ apartment layouts | Room polygons | Benchmark metrics | [AB] |
| [FP-MAE](https://doi.org/10.3390/buildings16030558) | Image regions | 8,000 floor plans | Plan image | Not read | [AB] |

- Fuchs and Borrmann explicitly propose as future work "generating the complete element, rather than individual properties", evaluated by recall and precision of predicted properties. They also suggest generating building components from scratch [FT] — [Fuchs and Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf).
- BIGNet's stated gain is a 72.7% improvement in average F1 over non-pretrained models on design checking. I found no reported score for how well masked features were restored [EX] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104).
- Conflict: the BIM-JEPA project page says 907,349 pre-training samples [AB] — [project page](https://jackswl.github.io/bim-jepa/); a Hugging Face description seen in search says over 2.1 million [SN] — [Hugging Face](https://huggingface.co/llama2thedog/BIM-JEPA-pretrained). These may be different checkpoints.
- Wisniewski and Wojcik 2025 study anomaly detection with simulated missing data on 12,500 elements from one office project. I read only the dataset passage, and it gives no named source for the model [EX] — [DEA 2025](http://www.wpias.edu.pl/ojs/index.php/dea/article/download/81/106).

### Inferences
- A reconstruction test is the cleanest way to test the proposed hypothesis, because the removed part is its own ground truth and no expert labelling is required. The ladder of difficulty is property, then element, then room or apartment, each scored on held-out models.
- Fuchs's regularity warning applies strongly to standardised models: a high infill score may reflect repetition. A trivial baseline (copy the most common or nearest value) has to be reported beside any model. Geç and Güzelci do report such baselines.

### Gaps
- I found no element-level masking on real Revit or IFC models with whole-element scoring. This comes from one web search and several OpenAlex queries, and does not prove that none exists.
- I found no study that writes restored elements into Revit and tests them for validity.

## Does any work vary the amount or typology of training models, comparing one model with many, or same typology with mixed?

### Takeaway
One study does this directly: Geç and Güzelci 2026, on door attributes from three Revit projects. Within one project results are strong, across projects they fall sharply, and combining different typologies did not restore them. No study I found compares many models of one typology with mixed typologies, so the core claim of the proposed hypothesis is untested.

### Cited Findings

**Geç and Güzelci 2026, random forest on bag-of-words room transitions [EX]** — all from [the paper](https://www.itcon.org/papers/2026_25-ITcon-Ge%C3%A7.pdf)

| Scenario | Train, test | Leaf material Acc / Macro-F1 | Leaf type Acc / Macro-F1 | Fire and smoke Acc / Macro-F1 | Door width MAE |
|---|---|---|---|---|---|
| 1 Intra | Hospital, hospital (grouped CV) | 0.927 / 0.926 | 0.905 / 0.789 | not captured | 93.5 mm |
| 2 Cross | Hospital, office | 0.839 / 0.464 | 0.932 / 0.372 | 0.724 / 0.229 | 163.5 mm |
| 3 Combined | Hospital + office, recreational | 0.342 / 0.209 | 0.676 / 0.404 | 0.482 / 0.262 | not captured |
| 4 Augmented | Same + about 20% of target, remaining 80% of target | 0.628 / 0.336 | 0.706 / 0.255 | 0.451 / not captured | 247.7 mm |

- The authors blame inconsistent naming, class imbalance and labels unseen in training. Frame type metrics collapse to zero in Scenario 2 because only one class is shared.
- They say that in Scenario 3 "the larger training set does not provide a more coherent learning signal".
- Reading cautions:
  - Scenarios 2 and 3 test different target projects, so they are not a clean comparison.
  - In Scenario 4 the authors say leaf type improves, but while accuracy rises its Macro-F1 falls from 0.404 to 0.255.
  - Door height in Scenario 1 is trivial (R² = 1.000) because hospital door heights are uniform.
  - The sentence giving door width for Scenario 4 reads "improves from Scenario 3 (MAE = 247.7 mm; R² = 0.064)". I take 247.7 mm as the Scenario 4 value, but the wording is ambiguous, so check the paper's table.
  - There is one project per typology, so same-typology and mixed cannot be separated.

**Other partial evidence**
- Ladrón de Guevara et al.: production uses a 512-dimension specialist per room type (coverage 98.1, navigability 79.2 on 50 rooms). The controlled model is one 256-dimension network for five types (54.9, 14.6 on 1,225 rooms). The authors say this "brackets rather than measures the effect", and a fixed-capacity shared-versus-specialist comparison "remains future work" [FT] — [arXiv 2512.04832](https://arxiv.org/pdf/2512.04832).
- BIGNet varies only the labelled share of its 16-model transfer set, from 0.1 to 0.5. Homogeneous graphs score 0.67, 0.73, 0.87, 0.89 and 0.91, against 0.44, 0.51, 0.64, 0.71 and 0.83 for heterogeneous graphs. These values are from the figure's text layer, so check against Figure 15. Pre-training pools hospital, residential and industrial models, and I found no per-type arm [EX] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104).
- Qwen-BIM varies the share of reasoning data across four groups, not the number or type of models [EX] — [Lin et al. 2026](https://arxiv.org/pdf/2602.20812).
- Fuchs and Borrmann pool office and residential models with no typology arm or learning curve [FT] — [Fuchs and Borrmann 2025](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf).
- Already recorded elsewhere: the Stuttgart corpus is 22 homogeneous residential files with no comparison arm (`ifc_generation.md`), and Austern et al. fall from about 98% to 81-90% on unseen files (`ifc_decomposition.md`).

### Inferences
- Geç and Güzelci support the first half of the hypothesis in weak form: one project learns its own conventions well. They do not test the second half.
- Their failures are largely label failures. For a data lake that mostly follows standards, the same-standard condition may remove much of this drop, and that is testable: same office and typology, same typology across offices, and mixed. This could be a clean original contribution.
- A credible design would hold typology and standard apart as separate factors and fix one held-out test set per typology. It would also train on increasing numbers of whole models (for example 1, 5, 20, N) and report a copy-from-training baseline. Hold-out must be by whole model. This is my proposal; I found no paper that uses it.
- "With one model it only reproduces" can be measured: reconstruct inside that model, then attempt an unseen model of the same type and compare.

### Gaps
- No same-typology versus mixed comparison, and no learning curve in number of models, was found for BIM generation or reconstruction. This comes from targeted searches on a thin literature, and closed-access papers may hold one.
- Evidence on Hornung-style generation with more typologies is missing, since the Stuttgart authors kept a single typology on purpose.

## What do the Revit API docs and Autodesk sources establish about recreating elements?

### Takeaway
Autodesk's documentation confirms the constraint that decides the experiment's design: every `NewFamilyInstance` overload requires the type to be loaded and active, and hosted placement requires a host that accepts it. Loadable families can be exported to RFA, but system families such as walls and in-place families cannot, so a text-only rebuild is impossible without a family library and a template.

### Cited Findings

**Loaded and active**
- "The type/symbol that is used must be loaded into the document before this method is called. Families and their symbols can be loaded using the Document.LoadFamily or Document.LoadFamilySymbol methods." This remark appears on all eight overload pages I checked [DOC] — for example [NewFamilyInstance with host](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/61601fe7-6d7e-e600-192d-207aa31c381c.htm).
- `ArgumentException` is "Thrown if the symbol is not active" [DOC] — [same](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/61601fe7-6d7e-e600-192d-207aa31c381c.htm). An Autodesk developer blog post advises ensuring "that all family symbols are activated before making use of them" — [Tammik 2014](https://blog.autodesk.io/activate-your-family-symbol-before-using-it/).
- `LoadFamily()` loads a family with all its types, and `LoadFamilySymbol()` loads one type. Autodesk recommends loading specific symbols when possible for performance [DOC] — [Family, Developer's Guide 2018](https://help.autodesk.com/cloudhelp/2018/ENU/Revit-API/Revit_API_Developers_Guide/Revit_Geometric_Elements/Family_Instances/Family.html).

**Hosted placement**
- `NewFamilyInstance(XYZ, FamilySymbol, Element, StructuralType)` is "used to insert one family instance into another element, such as inserting a window into a wall", and "The host object must be one that supports insertion of instances otherwise this method will fail" [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/61601fe7-6d7e-e600-192d-207aa31c381c.htm).
- The overload with a level throws if the symbol, host or level does not exist in the document, or the symbol is inactive. Autodesk describes this form as the most commonly used [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/168d4c67-73dd-d7c8-4969-12846eeaddfa.htm).
- Different placement types need different overloads:
  - Face-based takes a face reference, a point and a direction [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/be4b822c-829a-7e7b-8c03-a3a324bfb75b.htm).
  - Line-on-face fails unless `FamilyPlacementType` is suitable [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/993bb1aa-d039-d50b-7485-5f404add7cfa.htm).
  - A level-based family placed with the no-level overload throws `InvalidOperationException` [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/4a037d33-8251-2a50-5470-c98320e2faff.htm).

**Exporting and transferring families**
- "Each family is saved as an RFA file and all family types are saved with the family. Only loadable families can be saved with this option. In-place families and system families, such as walls, duct systems, and patterns, cannot be saved." The command is File > Save As > Library > Family [DOC] — [Save Loaded Families, Revit 2025](https://help.autodesk.com/cloudhelp/2025/ENU/Revit-Model/files/GUID-FC6CC53B-0010-4AF9-BFE2-6B044191A645.htm).
- `Document.EditFamily` "Gets the document of a loaded family to edit" and returns "an independent copy". It throws for in-place or non-editable families (check `IsInPlace`, `IsEditable`), and cannot run with an open transaction [DOC] — [reference](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API-MainReference/files/html/56e636ee-5008-0ee5-9d6c-5f622dedfbcb.htm).
- Batch export through the API: Autodesk's Jeremy Tammik describes `EditFamily` then `SaveAs` to RFA. In the logged test a door family saved, while a number of built-in mullion families failed with "Loaded Family Editing failed" — [The Building Coder, 2009](https://jeremytammik.github.io/tbc/a/0119_cases_1.htm). The post is old, so test on the current version.
- "API access to system family editing is not available" [DOC] — [About family documents, 2018](https://help.autodesk.com/cloudhelp/2018/ENU/Revit-API/Revit_API_Developers_Guide/Revit_Geometric_Elements/Family_Documents/About_family_documents.html).
- Cross-document copy exists: `ElementTransformUtils.CopyElements(Document, ICollection, Document, Transform, CopyPasteOptions)` returns the new IDs, and "The collection includes any elements created due to dependencies". It works for non-view-specific elements only [DOC] — [Copying Elements, 2019](https://help.autodesk.com/cloudhelp/2019/RUS/Revit-API/files/Revit_API_Developers_Guide/Basic_Interaction_with_Revit_Elements/Editing_Elements/Revit_API_Revit_API_Developers_Guide_Basic_Interaction_with_Revit_Elements_Editing_Elements_Copying_Elements_html.html).

**Fallback when a type is absent**
- DirectShape stores arbitrary geometry [SN] — [Autodesk 2025 help, search summary](https://help.autodesk.com/cloudhelp/2025/PTB/Revit-API/files/Revit_API_Developers_Guide/Revit_Geometric_Elements/Revit_API_Revit_API_Developers_Guide_Revit_Geometric_Elements_Sketching_html.html). My keyword check of that fetched page found no "DirectShape", so confirm this on the DirectShape class page.
- Speckle contrasts families, which give "full parametric behavior and schedule support", with DirectShape, for block imports — [Speckle, Feb 2026](https://speckle.systems/updates/native-revit-families-model-validation-beta/).
- Passing geometry between documents to `DirectShape.SetShape()` can silently reset material IDs, per a post on the Autodesk developer blog [SN] — [blog](https://blog.autodesk.io/revit-api-understanding-cross-document-material-handling-in-directshape-setshape/).

### Inferences
- The asset base is part of the experiment. A rebuild needs three things: the text; a family bundle of RFAs exported per model or from the office library; and a template holding system types such as wall types. Text alone cannot recreate a family's internal geometry.
- A minimal text record, as I read the API, needs at least: category; family and type names; level; location point or curve; facing and hand orientation or rotation; host ID; flip states; instance parameter overrides; and a source UniqueId in a mapping table for scoring, since new IDs will differ, as CBIM saw. Walls must be rebuilt before hosted elements, so serialization order is a dependency order.
- Three fidelity levels would make the first test honest, and each could be scored per class:
  1. Geometry and placement match, with tolerances.
  2. Family, type and host identity match.
  3. Parameters match, and a schedule comparison reproduces.
- Elements needing separate treatment on the first pass are in-place families, curtain walls, stairs, and non-editable families. Expect them to fail or fall back to DirectShape, and report the rate. I did not verify API behaviour for each class; this is a test list, not a finding.
- Copying through `CopyElements` would be a useful upper-bound control, because Revit resolves dependencies itself. Comparing the text route against it would show what serialization loses. This is my proposal.

### Gaps
- Not checked against official pages: creation overloads for walls, floors and roofs; and how wall types can be transferred through the API. A community answer recommends Transfer Project Standards for system families [SN]. Autodesk's own article on moving families between templates returned HTTP 403 to my client ([link](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-transfer-families-between-templates-in-Autodesk-Revit.html)).
- `LoadFamily` returning false for an already loaded family comes from a search summary only [SN], and the page returned 404 at the fetched URL.
- Whether an RFA saved in a newer Revit loads in an older one was not confirmed in the pages I read. CBIM only states that legacy Revit cannot open models from newer versions [FT]. Keep all models and families on one Revit version in the first test unless this is verified.
- The Developer's Guide pages I could fetch are from 2018 and 2019 and may be outdated. The loading, activation and hosting rules above come from the 2026 reference pages.

## Paper register: citation, verified PDF, licence and relevance

### Takeaway
Read CBIM, Fuchs and Borrmann, Geç and Güzelci and the BIM-native tokenization paper first. No pirate sources were used. Four listed papers have no PDF that I could verify (Iversen et al., Jin et al., BIM-JEPA, MaskLayout), and each is marked below.

### Cited Findings

Relevance is to "decompose Revit models and regenerate them". "PDF checked" follows the definition at the top of these notes.

| Title | Authors | Year, venue | DOI / ID | Direct PDF (check) | Licence | Relevance and reason | Read |
|---|---|---|---|---|---|---|---|
| CBIM: A Graph-based Approach to Enhance Interoperability Using Semantic Enrichment | Zijian Wang, Huaquan Ying, Rafael Sacks, André Borrmann | 2023, arXiv preprint | arXiv:2304.11672 | [PDF](https://arxiv.org/pdf/2304.11672) (checked) | CC BY-NC-SA 4.0 per `ifc_decomposition.md` | **High**: the only published existing-Revit to graph to Revit rebuild I found. | [FT] |
| Building-graph-AI: Graph neural networks learning and generating 3D detailed and layered building models | Jiadong Liang, Ximing Zhong, Shixin Zhao, Pia Fricker, Immanuel Koh | 2025, IJAC 23(3):640-654 | [10.1177/14780771251352946](https://doi.org/10.1177/14780771251352946) | [Post-print](https://aaltodoc.aalto.fi/bitstreams/7c46500d-f1bb-4dff-89c0-3b999fa59b9e/download) (checked) | Post-print CC BY-NC-ND per `ifc_generation.md` | **High**: Revit in, masked walls, Revit out, though the models derive from plans. | [EX] |
| Machine learning-based decision support framework for BIM component specification | İpek Geç, Orkan Zeynel Güzelci | 2026, ITcon 31:561-583 | [10.36680/j.itcon.2026.025](https://doi.org/10.36680/j.itcon.2026.025) | [PDF](https://www.itcon.org/papers/2026_25-ITcon-Ge%C3%A7.pdf) (checked) | Creative Commons Attribution, per PDF | **High**: the only direct within-project, cross-project and combined comparison on Revit data I found. | [EX] |
| Towards Semantic Enrichment of IFC Models through Language Modeling | Stefan Fuchs, André Borrmann | 2025, EG-ICE 2025 | [10.17868/strath.00093271](https://doi.org/10.17868/strath.00093271) | [PDF](https://strathprints.strath.ac.uk/93271/7/Fuchs-Borrmann-EG-ICE-2025-Towards-semantic-enrichment-of-IFC-models-through_.pdf) (checked) | CC BY 4.0 per `ifc_generation.md` | **High**: the only text-form comparison I read, on mostly Revit-authored IFC with masking. | [FT] |
| BIM-Native Tokenization for Constraint-Aware Room Layout Synthesis | Manuel Ladrón de Guevara, Jinmo Rhee, Ardavan Bidgoli, Vaidas Razgaitis, Michael Bergin | 2025 preprint, v3 Aug 2026, PDF carries an IEEE 2026 notice; venue not identified | arXiv:2512.04832 | [PDF](https://arxiv.org/pdf/2512.04832) (checked) | Conflict: arXiv page shows non-exclusive; OpenAlex shows CC BY-NC-SA | **High**: wall-hosted element sequences from professional BIM, trained for generation, though not Revit. | [FT] |
| Qwen-BIM: developing large language model for BIM-based design with domain-specific benchmark and dataset (the PDF title omits "Qwen-BIM:") | Jia-Rui Lin, Yun-Hong Cai, Xiang-Rui Ni, Shaojie Zhou, Peng Pan | 2026, preprint | arXiv:2602.20812 | [PDF](https://arxiv.org/pdf/2602.20812) (checked) | CC BY-NC-ND 4.0 per `ifc_generation.md` | **Medium**: decomposes Revit into text blocks, but only one way and for questions. | [EX] |
| Pretrained graph neural network for embedding semantic, spatial, and topological data in building information models | Jin Han, Xinzheng Lu, Jia-Rui Lin | 2025, CACAIE | [10.1111/mice.70073](https://doi.org/10.1111/mice.70073); arXiv:2509.11104 | [arXiv PDF](https://arxiv.org/pdf/2509.11104) (checked) | CC BY-NC-ND 4.0 on arXiv, per `ifc_decomposition.md` | **Medium**: largest Revit API corpus with masked pre-training, but no rebuild. | [EX] |
| Fully automated synthetic BIM dataset generation using a deep learning-based framework | Xing Liang, Nobuyoshi Yabuki, Tomohiro Fukuda | 2025, Automation in Construction 181, 106584 | [10.1016/j.autcon.2025.106584](https://doi.org/10.1016/j.autcon.2025.106584) | [PDF](https://ir.library.osaka-u.ac.jp/repo/ouka/all/103515/AutomConstr_181_106584.pdf) (checked) | CC BY 4.0 per PDF | **Medium**: a working Revit write path from a family library, with no extraction. | [EX] |
| Формування набору даних BIM-моделі для задач машинного навчання (Formation of BIM model dataset for machine learning tasks) | Валерій Михайлович Андрухов, Андрій Сергійович Потєха (V. Andrukhov, A. Potekha) | 2025, Сучасні технології, матеріали і конструкції в будівництві 38(1):87-94 | [10.31649/2311-1429-2025-1-87-94](https://doi.org/10.31649/2311-1429-2025-1-87-94) | [PDF](https://stmkvb.vntu.edu.ua/index.php/stmkvb/article/download/947/875) (checked) | CC BY 4.0 per journal page | **Medium**: a useful export schema and warnings, with no results or rebuild. | [FT] |
| A Big Data Approach to BIM Models | Christopher Beorkrem, Fernando J. Claudio Rodríguez, Alireza Karduni, Ashkan Radnia | 2020, ACSA 108 | [10.35483/acsa.am.108.120](https://doi.org/10.35483/acsa.am.108.120) | [PDF](https://www.acsa-arch.org/proceedings/Annual%20Meeting%20Proceedings/ACSA.AM.108/ACSA.AM.108.120.pdf) (checked) | Not stated in what I read | **Medium**: closest precedent for a firm's Revit data lake, without ML. | [EX] |
| ASK-BIM: A knowledge graph-powered AI system for natural language querying of BIM models | Andrea Ibba, Rubén Alonso, Diego Reforgiato Recupero | 2026, Data & Knowledge Engineering 164, 102581 | [10.1016/j.datak.2026.102581](https://doi.org/10.1016/j.datak.2026.102581) | [PDF](https://iris.unica.it/retrieve/a95197d4-ceb7-4f1e-808f-1e046a8fcc04/1-s2.0-S0169023X26000285-main.pdf) (checked) | CC BY 4.0 per PDF | **Low**: IFC query system with one building and no comparison to raw text. | [EX] |
| CBIM: object-level cloud collaboration platform for supporting across-domain asynchronous design | Zijian Wang, Boyuan Ouyang, Rafael Sacks | 2023, preprint | arXiv:2303.03854 | [PDF](https://arxiv.org/pdf/2303.03854) (checked) | CC BY-NC-SA 4.0 | **Medium**: a Revit-to-graph connector with GUID-linked geometry, sending references rather than rebuilding. | [EX] |
| BIM Information Extraction Through LLM-based Adaptive Exploration | S. Hellin, S. Jang, S. Fuchs, S. Nousias, A. Borrmann (initials as in PDF) | 2026, preprint | arXiv:2605.01698 | [PDF](https://arxiv.org/pdf/2605.01698) (checked) | CC BY 4.0 | **Low**: strong evidence of model heterogeneity, but on extraction. | [EX] |
| IDS-Constrained Text-to-Graph Querying for IFC Models | Ivan Smirnov, Tanya Bloch, Fulvio Re Cecconi, Sebastiano Maltese, Lavinia Chiara Tagliabue, Silvia Meschini, Shabtai Isaac | 2026, EC3 | [10.35490/ec3.2026.306](https://doi.org/10.35490/ec3.2026.306) | [PDF](https://ec-3.org/wp-content/uploads/2026/08/EC32026_306.pdf) (checked) | Not checked | **Low**: useful only for grammar-constrained output. | [EX] |
| Extracting BIM data to support a machine learning model for automated clash resolution | Ashit Harode, Walid Y. Thabet | 2023, EPiC Series in Built Environment | [10.29007/2x41](https://doi.org/10.29007/2x41) | [PDF](https://easychair.org/publications/paper/fNwz/download) (checked) | Not checked | **Low**: a commercial tool chain for a different task. | [AB] |
| Anomaly Detection in Incomplete BIM Models Based on Contrastive Learning | Damian Wisniewski, Aleksandra Wojcik | 2025, Data Engineering and Applications | [10.64972/dea.2025.v3i1.81](https://doi.org/10.64972/dea.2025.v3i1.81) | [PDF](http://www.wpias.edu.pl/ojs/index.php/dea/article/download/81/106) (checked) | Not stated | **Low**: simulated missingness on one project, with an unnamed source model. | [AB], plus dataset passage |
| FP-MAE: A Self-Supervised Model for Floorplan Generation with Incomplete Inputs | Jing Zhong, Ran Luo, Peilin Li, Tianrui Li, Pengyu Zeng, Zhifeng Lei, Tianjing Feng, Jun Yin | 2026, Buildings 16(3), 558 | [10.3390/buildings16030558](https://doi.org/10.3390/buildings16030558) | [Internet Archive copy](https://web.archive.org/web/20260203050124id_/https://www.mdpi.com/2075-5309/16/3/558/pdf) (checked); publisher URL returned 403 | CC BY per OpenAlex | **Low**: image masking, not BIM. | [AB] |
| Automating Building Model Preparation: A Comparison of LLM Performance on IFC-4x and IFC-5x | Odin Iversen, Eilif Hjelseth, Judith Fauth, Lizhen Huang | 2026, Digital Building Permit Conference 2025, LNCE | [10.1007/978-3-032-18226-5_8](https://doi.org/10.1007/978-3-032-18226-5_8) | **PDF not verified**: [listed URL](https://link.springer.com/content/pdf/10.1007/978-3-032-18226-5_8.pdf) gave my client a script challenge | CC BY-NC-ND per Unpaywall | **Medium**: a direct format comparison, with results unread. | [AB] |
| Evaluating large language models (LLMs) for semantic interpretation of IFC-based BIM data | Seokhyeon Jin, Dohyeong Kim, Jeehee Lee, Dongmin Lee | 2026, Automation in Construction 185, 106879 | [10.1016/j.autcon.2026.106879](https://doi.org/10.1016/j.autcon.2026.106879) | **No PDF verified**: Unpaywall lists a repository copy with no PDF URL | Not stated | **Medium**: direct JSON text input to LLMs, unread. | [AB] |
| Self-supervised learning for BIM element classification using a joint embedding predictive architecture | Jack Wei Lun Shi, Wawan Solihin, Yufeng Weng, Yimin Zhao, Leong Hien Poh, Justin Ker-Wei Yeoh | 2026, Automation in Construction | [10.1016/j.autcon.2026.107075](https://doi.org/10.1016/j.autcon.2026.107075) | **No open-access PDF found** (Unpaywall: closed) | Not stated | **Low**: masks geometry inside one element, and only in latent space. | [AB] |
| Masked irregular layout planning from partial input with fused modalities | Hang Zhang, Anton Savov, Benjamin Dillenburger | 2026, Automation in Construction, 107120 | [10.1016/j.autcon.2026.107120](https://doi.org/10.1016/j.autcon.2026.107120) | **PDF not verified**: [publisher URL](https://www.sciencedirect.com/science/article/pii/S0926580526003614/pdf) returned 403 to my client | CC BY per OpenAlex | **Low**: floor plans, not BIM, though a strong masking design reference. | [AB] |

IfcLLM (arXiv 2605.13236, PDF checked again today) is recorded in `ifc_decomposition.md`, so it is not repeated here. The short CEUR version of ASK-BIM is at [Vol-3979](https://ceur-ws.org/Vol-3979/short3.pdf) (checked).

### Inferences
- Across all sections, the hypothesis has support for its parts, but not for the whole:
  - Serialisation with some structure is workable (Fuchs, Qwen-BIM).
  - Rebuild is feasible at early design level (CBIM).
  - One project learns its own patterns (Geç and Güzelci).
  - The claim that many models of one typology teach that typology's rules has no direct test.
- The word "text" may need defending. CBIM and Building-Graph-AI rebuild from graphs and tables, and the only structured-versus-text comparison I found on room embeddings has mixed results. A text form is justified by access to LLM pre-training (Fuchs's argument), not by shown superiority.

### Gaps
- "Not stated" and "Not checked" do not confirm any licence terms.
- Claims about absence rest on keyword checks for [EX] papers, and on my searches of arXiv, OpenAlex and general web search. I did not run dedicated searches of Semantic Scholar, ACADIA, CAADRIA or Autodesk University.
- Licences marked "per" another note were not re-checked today.
