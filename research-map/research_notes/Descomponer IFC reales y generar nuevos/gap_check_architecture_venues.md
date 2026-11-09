# Gap check in architecture venues: does any work go from real BIM/IFC, through learned parts or rules, to a new valid BIM/IFC model?

Search date: 2026-11-08.

Verification tags used on every record:
- **[FT]** I read most of the body of the paper.
- **[EX]** I extracted the PDF text and read targeted passages.
- **[AB]** Abstract or repository record only.
- **[SN]** Search-engine snippet only.
- **[MD]** Title and bibliographic metadata only. I know nothing about the method.

"PDF OK" means a scripted GET on 2026-11-08 returned HTTP 200 with a file starting `%PDF`. "PDF blocked" means the URL refused the script, so I could not confirm it.

## Did any paper disprove the gap, and exactly what was searched?

### Takeaway
**I found no paper that contradicts the full claim.** Nothing I could verify goes from real BIM/IFC models, through learned or inferred parts or rules, to a new valid BIM/IFC building. But the claim as worded in the earlier notes is too broad in three places, and CumInCAD itself could not be searched, so this is a strong negative result, not a proof of absence.

### Cited Findings

**Three partial contradictions that change how the gap must be stated**

1. **Mining modules from BIM has been done.** Cao and Hall detect repeated modules across several BIM projects with gSpan frequent subgraph mining, then map them back to BIM elements by ID [FT] — [Cao & Hall 2021](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf). This contradicts the framing in `assembly_methods.md` that automatic extraction of a module set from BIM is untouched. Its limits are large: the data are ten floorplans the authors built in BIM from two standard company modules, only walls and floors, via the Revit API (`OST_Walls`) rather than IFC, and nothing new is generated.
2. **Learn rules from examples, then generate new layouts, has been done in a BIM platform.** Rules are learned from example layouts, and a generator then produces new layouts from those rules, compared with the originals in a user survey [EX] — [Sydora & Stroulia 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_220.pdf). Its limits: furniture only, in nine room scenarios with eighteen layouts each, and the examples were made by recruited participants in a layout editor, not taken from real BIM projects.
3. **Real finished BIM models, a learned model, and output inserted into new BIM models has been done at the level of details.** A k-NN toolkit trained on connections from 10 finished steel models predicted and inserted connections in 3 other models, and the author reports they were valid [AB] — [Helminen 2019](https://trepo.tuni.fi/handle/10024/115724). This is the only work I found with real BIM in and BIM elements out. It is completion of an existing model, not a new building, and there is no decomposition into parts. I could not read the full text.

**The full pipeline has been announced as future work**

- Bielski, Langenhan and colleagues describe converting IFC into aGraphML to analyse schools "and generate variations as part of our future work", with deep learning on a case base and results "to be used in Autodesk Revit in later stages" [EX] — [Bielski et al. 2020](https://papers.cumincad.org/data/works/att/ecaade2020_227.pdf). I found no later paper from that group that delivers it. What I found are parts: link prediction on spatial graphs — [Eisenstadt et al. 2022](https://papers.cumincad.org/data/works/att/ecaade2022_222.pdf) — and a fingerprint and knowledge-graph framework — [Langenhan et al. 2023](https://papers.cumincad.org/data/works/att/caadria2023_292.pdf). This is the main priority risk for the thesis.

**Exactly what was searched**

*CumInCAD (papers.cumincad.org): the search interface was NOT used.* All search and record pages redirect to a human-verification page, which says it exists to protect the site from automated bots — [CumInCAD verification page](https://papers.cumincad.org/verification.php). I did not tick the box from a script, because that would misrepresent an automated client as a person, and you excluded your Chrome browser. As a substitute I searched Crossref's records for DOI prefix `10.52842`, which covers CAADRIA, eCAADe, ACADIA and SIGraDi. Individual PDFs under `/data/works/att/` are served without the gate, as in the earlier notes, so I read a small number of them directly; the paper ID comes from the DOI redirect.

*Crossref (`query.bibliographic`, top 60 per query, any year).* The filters were `prefix:10.52842`, `issn:1478-0771` (IJAC) and `issn:0926-5805` (Automation in Construction). Totals are inflated because Crossref ORs the terms, so I screened only the top 60 of each.

| Query | 10.52842 total | IJAC total | AutoCon total |
|---|---|---|---|
| BIM generative design machine learning | 9772 | 356 | 1778 |
| IFC generative model learned | 621 | 57 | 713 |
| generate BIM models from existing BIM models | 906 | 79 | 1010 |
| BIM shape grammar inference | 427 | 44 | 605 |
| grammar extracted from BIM models | 938 | 88 | 992 |
| Revit model generation machine learning | 914 | 71 | 1172 |
| graph neural network BIM generation | 595 | 54 | 1036 |
| knowledge graph BIM generative design | 9763 | 340 | 1366 |
| BIM component reuse assembly generation | 557 | 43 | 788 |
| BIM model decomposition modules reuse | 578 | 33 | 1006 |
| building information model retrieval case-based design | 9786 | 412 | 2956 |
| design rules extraction from BIM models | 9771 | 346 | 1578 |
| rule mining building information models | 1024 | 86 | 1105 |
| typology patterns BIM models clustering | 578 | 52 | 784 |
| frequent subgraph mining IFC | 36 | 0 | 238 |
| implicit knowledge BIM models machine learning | 1065 | 88 | 1494 |
| architectural design patterns learned from BIM | 9790 | 916 | 1464 |
| generate interior layout fixed envelope BIM | 377 | 32 | 669 |
| renovation generative design BIM | 9760 | 330 | 1193 |
| retrofit generative design IFC | 9742 | 322 | 879 |
| existing building model generative design scan-to-BIM | 9778 | 370 | 2061 |
| autocomplete BIM element prediction | 297 | 20 | 705 |
| modular building BIM generative graph | 1182 (on retry) | 110 | 1406 |
| deep generative 3D building semantic elements BIM | 1698 | 154 | 2036 |

This gave 1,496 unique records: 238 eCAADe, 233 CAADRIA, 63 ACADIA and 24 SIGraDi under the prefix, the rest IJAC and AutoCon. I screened them by regex on the title (BIM term plus a generation, rule, part or typology term), which left 172, and read those 172 titles. Only 282 of the 1,496 records carry an abstract, so this screen depends on titles.

*Crossref, extra.* Six queries (`BIM generative learning`, `IFC model graph learning`, `building information model rules extraction generation`, `BIM typology patterns`, `BIM renovation generative`, `BIM parts assembly reuse`) with `query.container-title` set to `CAAD Futures` and to `Computer-Aided Architectural Design`, and again with `filter=prefix:10.5151` for older SIGraDi. Totals ranged from 71 to 496,064 and are not meaningful. Top 40 screened per query.

*OpenAlex (`title_and_abstract.search`, year > 2017, all venues, top 100 by relevance).* `BIM` below stands for `("BIM" OR "IFC" OR "Revit" OR "building information model" OR "building information models" OR "building information modeling" OR "building information modelling")`.

| Label | Search string | Count |
|---|---|---|
| A1 | BIM AND (generate OR generating OR generation OR generative) AND ("learned from" OR "learn from" OR "learning from" OR "extracted from existing" OR "existing BIM" OR "real BIM" OR "real IFC" OR "real-world BIM" OR "real-world IFC") | 123 |
| A2 | BIM AND ("grammar inference" OR "inverse procedural" OR "grammar induction" OR "infer grammar" OR "learned grammar" OR "extract grammar" OR "graph grammar" OR "shape grammar") | 33 |
| A3 | BIM AND ("kit of parts" OR "reusable modules" OR "reusable components" OR "reusable blocks" OR "module extraction" OR "recombination" OR "assembly-based" OR "subgraph extraction") AND (generate OR generation OR generative OR design) | 25 |
| A4 | BIM AND ("graph generation" OR "generative model" OR "diffusion model" OR "variational autoencoder" OR "graph autoencoder" OR "GAN" OR "generative adversarial" OR "DGMG" OR "GraphRNN") | 219 |
| A5 | ("generate IFC" OR "generating IFC" OR "IFC generation" OR "IFC models generated" OR "new IFC" OR "valid IFC" OR "generate BIM models" OR "generating BIM models" OR "new BIM models") AND ("machine learning" OR "deep learning" OR "neural" OR "learned" OR "training") | 13 |
| B1 | BIM AND ("rule mining" OR "association rule" OR "rule learning" OR "inductive logic" OR "rule inference" OR "mining design" OR "design rules" OR "design knowledge extraction" OR "extract design knowledge" OR "implicit knowledge" OR "tacit knowledge") | 117 |
| B2 | BIM AND ("typology" OR "typologies" OR "typological" OR "design patterns" OR "spatial patterns" OR "pattern mining" OR "frequent subgraph" OR "frequent pattern") AND (learn OR mining OR clustering OR extraction OR unsupervised OR collection OR dataset OR corpus) | 61 |
| B3 | ("collection of BIM" OR "corpus of BIM" OR "dataset of BIM" OR "dataset of IFC" OR "collection of IFC" OR "repository of BIM" OR "BIM repository" OR "large set of BIM" OR "hundreds of BIM" OR "archive of BIM") AND (design OR pattern OR rule OR generate) | 5 |
| C1 | BIM AND (generate OR generation OR generative OR "machine learning" OR "deep learning") AND ("fixed envelope" OR "given envelope" OR "existing envelope" OR "building envelope constraint" OR "given footprint" OR "fixed footprint" OR "interior layout" OR "interior fit-out" OR "fit-out" OR "infill") | 13 |
| C2 | BIM AND ("generative" OR "generate") AND ("renovation" OR "refurbishment" OR "retrofit" OR "adaptive reuse" OR "conversion" OR "existing building") AND ("learning" OR "neural" OR "AI" OR "algorithm") | 140 |
| C3 | BIM AND ("autocomplete" OR "autocompletion" OR "auto-completion" OR "link prediction" OR "model completion" OR "next element" OR "command prediction" OR "design recommendation" OR "component recommendation") | 28 |
| D1 | BIM AND ("learn" OR "learning" OR "trained") AND ("MEP layout" OR "MEP design" OR "structural layout" OR "structural design" OR "shear wall layout" OR "rebar design" OR "duct layout") AND (generate OR generation OR generative) | 21 |
| D2 | "MEP" AND ("BIM" OR "IFC") AND ("reuse" OR "reusable" OR "decompose" OR "decomposition") AND ("block" OR "blocks" OR "module" OR "modules" OR "subsystem") | 1 |
| E1 | BIM AND ("case-based" OR "semantic fingerprint" OR "design retrieval" OR "precedent" OR "similar models" OR "model retrieval") AND (design OR reuse) | **Failed: HTTP 429** |

This gave 562 unique works. A title exclusion regex (scan-to-BIM, energy, safety, heritage, survey, review and similar) left 345, and I read those titles. The free daily OpenAlex budget ran out at E1, so case-based retrieval was not searched there.

*Web search.* `learn rules from BIM models generate new BIM model cumincad` (restricted to papers.cumincad.org and cumincad.architexturez.net; no results from those domains); `Cao Hall graph mining frequent pattern module identification BIM multiple projects modular library`; `Sydora Stroulia learning interior design rules from example BIM layouts generative`; `Napps Aziz Shin König Exploring Hierarchical Building Graph Generation Through AI-Based Modeling`; `Krijnen Tamke Assessing Implicit Knowledge in BIM Models with Machine Learning`; `deep learning trained on IFC models generate new building semantic graph variations Revit aGraphML school case base 2023 2025 Bielski Langenhan`; `"BIM" subgraph mining extracted reusable design patterns recombine generate new model from existing project models architecture`; `renovation generate new BIM IFC interior within existing building envelope trained learned from BIM data apartment conversion`; `Helminen "Automated generation of steel connections" BIM machine learning k-NN Tampere thesis`. These returned about 10 links each, with no result counts.

*Not usable.* Semantic Scholar returned HTTP 429 on the test call and on all six paced queries that ran before my script timed out, so it contributed nothing. The query list was `learn parts from BIM models generate new BIM models`, `grammar inference from IFC building models`, `frequent subgraph mining BIM modules generation`, `design rules learned from Revit models generative`, `generative model trained on IFC building graph`, `interior generation fixed envelope BIM learned from existing models`; two further queries never ran. Google Scholar was not attempted because it needs a browser. `cumincad.architexturez.net` did not resolve. Venue proceedings pages were not browsed.

**Result by venue**

| Venue | Coverage | Closest work surfaced | Contradicts the gap? |
|---|---|---|---|
| CAADRIA | Crossref sample; no abstracts for many | Langenhan 2023; Graph-BIM and Bauscher 2024 (already known) | No |
| eCAADe | Crossref sample | Bielski 2020, Eisenstadt 2022, Feliksińska-Świerz 2026 | No; Bielski announces it as future work |
| ACADIA | Crossref sample, small | BIM Hyperreality (synthetic training data) [MD] | No |
| SIGraDi | Crossref sample, small | [Brígitte & Ruschel 2018](https://doi.org/10.5151/sigradi2018-1466) on patterns for algorithmization in social housing [MD] | Not on title; unread |
| CAAD Futures | **Effectively uncovered**: almost no BIM-titled records | None | Unknown |
| IJAC | Crossref by ISSN | Renner 2025 and Liang 2025 (already known) | No |
| Automation in Construction | Crossref by ISSN | Cao 2021 configurator, Sydora 2020, BIM log mining series | No |

### Inferences
- The sources that came closest are not architecture venues: EC3, a master's thesis, and a PhD thesis. The earlier researchers' venue blind spot hid less than feared, but looking outside the listed venues was what produced the partial contradictions.
- The pipeline's stages each exist somewhere, and the stage combinations are what is missing. The defensible gap statement is now narrower:

> Existing work mines modules from synthetic or single-firm BIM data without generating buildings, learns rules from staged examples to arrange furniture inside fixed rooms, or completes real models with predicted details. None of the work I could verify learns parts or rules from a collection of real BIM/IFC models from independent sources and uses them to generate a new whole-building model that is written back and validated as BIM/IFC.

### Gaps
- **The CumInCAD search must be run by a person** (one checkbox) before the thesis states this as confirmed. Suggested strings: `BIM grammar`, `IFC generative`, `BIM learning rules`, `IFC graph generation`, `BIM typology`, `BIM reuse parts`, `Revit machine learning`, `BIM renovation generative`.
- CAAD Futures is not covered. Google Scholar and Semantic Scholar contributed nothing. Case-based retrieval (E1) was not run in OpenAlex.
- Title-based screening misses any paper whose title does not mention BIM, IFC or Revit, and OpenAlex results over 100 were truncated (A1, A4, B1, C2).

## In these venues, is there work that learns parts, modules, rules or grammars from real BIM, Revit or IFC models and then generates new BIM models?

### Takeaway
No. Grammars in this literature are hand-written or are mappings between schemas, never inferred from BIM. Modules have been mined from BIM, once clearly and on staged data, without generation.

### Cited Findings
- Cao and Hall's framework: extract elements through the BIM API, compute adjacency by 3D collision detection, build labelled attributed graphs, run gSpan across projects, filter by shape and manufacturing limits, then match subgraphs back to element IDs [FT] — [Cao & Hall 2021](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf).
- Its data are not real project history: "we collect two standard types of modules ... from a collaborative company, and use them to create ten customized floorplans in BIM", then add changes as noise [FT] — [same](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf).
- Its reported limits are irregular patterns, inconsistent naming across historical projects, and missing boundary and connection information in most BIM files [FT] — [same](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf). The authors also say earlier module studies "end up with graph represented solutions, rather than BIMs" [FT].
- The same group built a configurator that goes from a pre-engineered kit-of-parts and production rules to floor plan and 3D model, but the kit and rules are authored, not mined [AB] — [Cao et al. 2021](https://doi.org/10.1016/j.autcon.2020.103437). A later paper adds a graph database and graph similarity analysis for module libraries, validated on one timber panel system [AB] — [Cao et al. 2022](https://doi.org/10.1016/j.compind.2022.103659).
- Shape grammar plus Revit exists, with the rule system written by the authors from one modular housing project and used to build a Revit module library [AB] — [Wang, Zhou & Zhang 2023](https://doi.org/10.1080/13467581.2023.2292081).
- Graph-constrained generation with a GCN from a "generic BIM-based graph representation", followed by IFC semantic enrichment, exists for precast buildings. The abstract does not state the training data [AB] — [Li et al. 2024](https://doi.org/10.1016/j.dibe.2024.100418).
- HVAC terminal pipe layouts have been used to train GAE, GNF, GAN and diffusion graph generators, which the authors present as uncovering hidden design patterns, with accuracy above 90% and precision above 75% [AB] — [Wang et al. 2024](https://doi.org/10.3390/buildings14113405). The abstract compares against "automated forward design solutions" and also "the actual design", so I cannot tell how much of the data is real, or whether output returns to BIM.
- Triple graph grammars in CAADRIA and eCAADe map IFC into other structures or CityGML. They are authored mappings and do not generate buildings [MD] — [CAADRIA 2019](https://doi.org/10.52842/conf.caadria.2019.1.605); [eCAADe 2018](https://doi.org/10.52842/conf.ecaade.2018.1.517).
- Searches A2 (33 hits) and D2 (1 hit) returned no grammar inference from BIM. The D2 hit, on hierarchical MEP decomposition, may be the unidentified lead in `assembly_methods.md`, but I read only its title [MD] — [Zhang et al. 2026](https://doi.org/10.1016/j.aei.2026.104428).

### Inferences
- Mining with gSpan (Cao & Hall) and configuring from a kit (Cao et al. 2021) sit in the same ETH group. They are the two halves of the thesis pipeline for prefabricated buildings. I found no paper joining them, but my search of that group's output was not exhaustive.
- Cao and Hall's staged data remove the exact condition the thesis cares about, different modelers. Their naming limitation is an independent warning about it.

### Gaps
- I could not read Cao 2021, Cao 2022, Li 2024 or Wang 2024 in full because the publisher blocks scripts.
- [Napps et al. 2025](https://doi.org/10.1007/978-981-96-8761-9_6), "Exploring Hierarchical Building Graph Generation Through AI-Based Modeling", is **the one title I could not rule out**. I have only metadata [MD]: no abstract was retrievable, and Unpaywall reports it as closed. Check it by hand.

## Is there work on inferring design rules or typology patterns from a collection of BIM models?

### Takeaway
Yes, but it stops at analysis or prediction. It uses few models, usually clusters elements rather than buildings, and never feeds a generator. Learning across projects degrades, which supports the thesis's data-quality concern.

### Cited Findings
- Three real projects, 5,763 Revit door instances, Random Forest predicting door attributes from room-to-room transitions. Performance "decreased across projects due to inconsistent naming, class imbalance, and label mismatch" [EX] — [Geç & Güzelci 2026](https://www.itcon.org/papers/2026_25-ITcon-Ge%C3%A7.pdf). The authors call it a proof of concept, not an implemented system [EX].
- K-means on Revit schedule data from three real projects (walls, columns, walls) reveals "implicit typologies" and inconsistencies. Results return through Dynamo for visualization only, and the authors insist on real-world models over vendor or academic samples [EX] — [Feliksińska-Świerz et al. 2026](https://papers.cumincad.org/data/works/att/ecaade2026_497.pdf). The clusters are of elements within a project, not of buildings.
- Earlier framing of the same idea, deducing implicit knowledge "from a set of BIM models": supervised learning completes missing attributes, and unsupervised methods flag anomalous elements [EX] — [Krijnen & Tamke 2015](https://duraark.github.io/website/wp-content/uploads/2016/02/Krijnen-Tamke-Assessing-implicit-knowledge-in-BIM-models-with-machine-learning-v3.pdf).
- A decision tree trained on space information in BIM data yields expert rules for space layout quality "only from data", used to evaluate, not generate [AB] — [Kwon & Cho 2019](https://doi.org/10.7315/cde.2019.126).
- School typologies: the authors propose to "analyse, derive and combine patterns of schools" from IFC-derived graphs. The results reported are a correlation between spatial proportion and room types [EX] — [Bielski et al. 2020](https://papers.cumincad.org/data/works/att/ecaade2020_227.pdf).
- Spatial topology extracted from BIM into knowledge graphs, used to train networks through a tensor "relation map" [EX] — [Langenhan et al. 2023](https://papers.cumincad.org/data/works/att/caadria2023_292.pdf). Graph-based retrieval of BIM models precedes it [SN] — [Langenhan et al. 2013](https://doi.org/10.1016/j.aei.2013.04.005).
- Spatial typology inserted into BIM comes from Neufert and published cases as a parametric office prototype. It is authored and not mined from BIM models [EX] — [Nagakura & Sung 2017](https://papers.cumincad.org/data/works/att/ecaade2017_130.pdf).
- BIM log mining learns modeling commands and event sequences rather than building structure [MD] — [Automation in Construction 2020](https://doi.org/10.1016/j.autcon.2020.103107); [2017](https://doi.org/10.1016/j.autcon.2017.04.012).

### Inferences
- Geç & Güzelci is useful independent evidence for the argument in `ifc_data_quality.md`: within-project signal is real, and cross-project transfer is where naming breaks it.
- None of these works reports a building-level typology learned across many BIM models. The thesis's typology step would be new, not just its generation step.

### Gaps
- Two Elsevier titles look relevant, but I did not read them, and Unpaywall reports both closed: [Abdirad & Mathur 2021](https://doi.org/10.1016/j.aei.2021.101414) on association rule mining for detailing, and [Na et al. 2020](https://doi.org/10.1016/j.autcon.2020.103290) on BIM-based spatial patterns [MD].
- I did not establish how many models or which data Bielski 2020 and Eisenstadt 2022 used. The strings "IFC" and "Revit" did not appear in my search of the Eisenstadt text.

## Is there work on generating building models conditioned on a fixed envelope, a fixed footprint, or a renovation context, starting from BIM data?

### Takeaway
I found nothing that learns from BIM data and generates a building inside a fixed envelope or for a renovation. The nearest are furniture inside IFC-derived rooms, and rule-based or optimization methods applied to scanned buildings.

### Cited Findings
- Sydora's platform cannot create walls or floors, so "models in BIM-kit initially come from IFC files". Walls stay fixed and furnishings are arranged inside them, by authored or learned RuleDSL rules [EX] — [Sydora 2024](https://ualberta.scholaris.ca/server/api/core/bitstreams/9a448b6a-0e55-4c0c-99d9-8b6a91fdb376/content). Rule learning was tested on synthetic layouts generated from expert rules and then on human layouts [EX] — [same](https://ualberta.scholaris.ca/server/api/core/bitstreams/9a448b6a-0e55-4c0c-99d9-8b6a91fdb376/content). In the passages I read, nothing says generated layouts are written back to IFC.
- Renovation: a framework reconstructs interiors from point clouds, then applies generative design to layouts, reporting about 10% to 20% lower "predicted transmission" in an existing office. Its learning is on scans, not on BIM collections [SN] — [Cai et al. 2024](https://doi.org/10.1108/ecam-07-2024-0984).
- A graph method assesses whether one non-modular BIM design can be converted, using cycle similarity for volumetric modules and dynamic programming for panels, validated on one model. This is decomposition with existing geometry as the constraint, but with no learning and no new model [AB] — [Zapata, Oh & Chang 2026](https://doi.org/10.1061/9780784486979.093).
- A project deliverable describes extracting reusable components from buildings due for demolition and matching them by geometry to new design requirements, inside BIM workflows. It says nothing about learning [AB] — [Aktas 2025](https://doi.org/10.5281/zenodo.17856559).
- Semantic rule sets for renovation exist, but for model checking, not generation [AB] — [Cepeda Gutiérrez et al. 2021](https://doi.org/10.14279/depositonce-12566).
- Searches C1 (13 hits) and C2 (140 hits, top 100 screened) produced no learned, BIM-sourced, envelope-conditioned generator. C1 surfaced a paper on interior layout from BIM and deep learning, **which has been retracted, so do not cite it** [AB] — [retraction notice](https://doi.org/10.1155/2023/9823950).

### Inferences
- The envelope-conditioned stage is the least occupied part of the pipeline in anything from BIM data. A thesis focused on a fixed envelope gains a clearer contribution there, but also has no direct benchmark to compare against.

### Gaps
- I read only the abstract or a snippet of Cai 2024, Zapata 2026 and Aktas 2025.
- Conditioned floor plan generation outside BIM was out of scope and is already covered in `assembly_methods.md`.

## Who is closest, and what exactly is missing from each one compared with the thesis question?

### Takeaway
Three new works each cover about two to three of the five stages, and none covers real multi-source input together with whole-building generation. The earlier closest match, Hornung and Renner, is still the closest on real IFC input.

### Cited Findings

| Work | Real BIM/IFC collection in | Learned parts or rules | New whole building | Written to BIM/IFC | Validity checked | Evidence |
|---|---|---|---|---|---|---|
| Hornung / Renner 2025 (known; see [`ifc_generation.md`](ifc_generation.md)) | Yes, 22 IFC | Next-node model, not parts | Partial | No | No | prior notes |
| [Helminen 2019](https://trepo.tuni.fi/handle/10024/115724) | Yes, 10 finished models | k-NN on connections, not parts | No, details only | Yes, in BIM | Claimed valid; method unread | [AB] |
| [Cao & Hall 2021](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf) | No, 10 staged plans in Revit | Yes, mined modules | No | Highlights existing elements only | Manufacturing limits only | [FT] |
| [Sydora & Stroulia 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_220.pdf) | No, participant layouts | Yes, explicit rules | No, furniture in rooms | Not stated | Learned rules; user survey | [EX] |
| [Bielski et al. 2020](https://papers.cumincad.org/data/works/att/ecaade2020_227.pdf) | Yes in intent, IFC schools | Analysis only so far | Future work | Future work | No | [EX] |
| [Li et al. 2024](https://doi.org/10.1016/j.dibe.2024.100418) | Unknown | GCN layout features | Layouts | IFC enrichment, details unread | Unknown | [AB] |
| [Wang et al. 2024](https://doi.org/10.3390/buildings14113405) | Unclear | Graph generators on pipes | No, one MEP subsystem | Unknown | Accuracy metrics | [AB] |

**Paper register (excludes papers already in the earlier notes)**

*Direct PDF confirmed:*

1. **Module library development via graph mining.** Jianpeng Cao, Daniel Hall. 2021. EC3 2021. DOI [10.35490/ec3.2021.151](https://doi.org/10.35490/ec3.2021.151). [PDF OK](https://ec-3.org/wp-content/uploads/2025/10/EC32021_151.pdf). License not stated in what I read. **High**: the only work I found that mines reusable modules across BIM projects. [FT]
2. **Learning Interior Design Rules from User-created Layout Examples.** Christoph Sydora, Eleni Stroulia. 2025. EC3 / CIB W78 2025. DOI [10.35490/ec3.2025.220](https://doi.org/10.35490/ec3.2025.220). [PDF OK](https://ec-3.org/wp-content/uploads/2025/10/EC32025_220.pdf). License not stated in what I read. **High**: closest structural match to examples, then rules, then new layouts. [EX; the PDF text layer is scrambled and I decoded it with a character shift, in which digits were lost.]
3. **Reasoning About Interior Building Design, Grounded on Design Rules.** Christoph Peter Sydora. 2024. PhD thesis, University of Alberta. No DOI found. [PDF OK](https://ualberta.scholaris.ca/server/api/core/bitstreams/9a448b6a-0e55-4c0c-99d9-8b6a91fdb376/content). License not checked. **High**: full method, and shows rooms can come from IFC. [EX]
4. **Topological Queries and Analysis of School Buildings Based on Building Information Modeling (BIM) Using Parametric Design Tools and Visual Programming to Develop New Building Typologies.** Jessica Bielski, Christoph Langenhan, Babara Weyand, Markus Neuber, Viktor Eisenstadt, Klaus-Dieter Althoff. 2020. eCAADe 38. DOI [10.52842/conf.ecaade.2020.2.279](https://doi.org/10.52842/conf.ecaade.2020.2.279). [PDF OK](https://papers.cumincad.org/data/works/att/ecaade2020_227.pdf). License not stated. **High**: publicly announces essentially the thesis pipeline as future work. [EX]
5. **Unsupervised AI as an Interpretive Framework for BIM: Probing Model Knowledge in Architectural Computation.** Zofia Feliksińska-Świerz, Anetta Kępczyńska-Walczak, Artur Wirowski. 2026. eCAADe 44. DOI [10.52842/conf.ecaade.2026.1.389](https://doi.org/10.52842/conf.ecaade.2026.1.389). [PDF OK](https://papers.cumincad.org/data/works/att/ecaade2026_497.pdf). License not stated. **Medium**: recent, real Revit models, implicit typologies, but no generation. [EX]
6. **Machine learning-based decision support framework for BIM component specification.** İpek Geç, Orkan Zeynel Güzelci. 2026. ITcon 31. DOI [10.36680/j.itcon.2026.025](https://doi.org/10.36680/j.itcon.2026.025). [PDF OK](https://www.itcon.org/papers/2026_25-ITcon-Ge%C3%A7.pdf). CC BY per OpenAlex. **Medium**: measures cross-project knowledge transfer from real Revit models. [EX]
7. **Assessing Implicit Knowledge in BIM Models with Machine Learning.** Thomas Krijnen, Martin Tamke. 2015. Modelling Behaviour (Design Modelling Symposium). DOI [10.1007/978-3-319-24208-8_33](https://doi.org/10.1007/978-3-319-24208-8_33). [PDF OK, project-site author copy](https://duraark.github.io/website/wp-content/uploads/2016/02/Krijnen-Tamke-Assessing-implicit-knowledge-in-BIM-models-with-machine-learning-v3.pdf), not the Springer version. License not stated. **Medium**: early precedent for learning across a set of BIM models. [EX]
8. **Autocompletion of Design Data in Semantic Building Models using Link Prediction and Graph Neural Networks.** Viktor Eisenstadt, Jessica Bielski, Christoph Langenhan, Klaus-Dieter Althoff, Andreas Dengel. 2022. eCAADe 40. DOI [10.52842/conf.ecaade.2022.1.501](https://doi.org/10.52842/conf.ecaade.2022.1.501). [PDF OK](https://papers.cumincad.org/data/works/att/ecaade2022_222.pdf). License not stated. **Medium**: part of the follow-up to Bielski, predicting spatial links rather than generating models. [EX]
9. **Cross-Disciplinary Semantic Building Fingerprints: Knowledge Graphs To Store Topological Building Information Derived From Semantic Building Models (BIM) To Apply Methods Of Artificial Intelligence (AI) Throughout The Life Cycle Of Buildings.** Christoph Langenhan, Jessica Bielski, Christoph Ziegler, Viktor Eisenstadt, Klaus-Dieter Althoff, Andreas Dengel. 2023. CAADRIA 28. DOI [10.52842/conf.caadria.2023.1.129](https://doi.org/10.52842/conf.caadria.2023.1.129). [PDF OK](https://papers.cumincad.org/data/works/att/caadria2023_292.pdf). License not stated. Title follows the PDF; the Crossref title differs slightly. **Medium**: BIM-derived topology as AI input. [EX]
10. **Spatial Typology for BIM - Preassembling for Synthetic Architectural Design.** Takehiko Nagakura, Woongki Sung. 2017. eCAADe 35. DOI [10.52842/conf.ecaade.2017.1.129](https://doi.org/10.52842/conf.ecaade.2017.1.129). [PDF OK](https://papers.cumincad.org/data/works/att/ecaade2017_130.pdf). License not stated. **Low**: typology placed in BIM by hand, a useful contrast. [EX]
11. **Unified Network-Based Representation of BIM Models for Embedding Semantic, Spatial, and Topological Data.** Jin Han, Xin-Zheng Lu, Jia-Rui Lin. 2025. arXiv [2505.22670](https://arxiv.org/abs/2505.22670). [PDF OK](https://arxiv.org/pdf/2505.22670). License not checked. **Low**: representation only, though it names implicit design patterns as the goal. [AB plus targeted search of the text]

*No PDF confirmed:*

12. **Automated generation of steel connections of BIM by machine learning.** Joonas Helminen. 2019. Master's thesis, Tampere University. [URN](https://urn.fi/URN:NBN:fi:tuni-201906252205). No DOI found. **PDF not confirmed**: the repository sits behind a "not a bot" check, which I did not try to pass. License not known. A paper with the same title exists at [ICCCBE 2018](https://programme.exordo.com/icccbe2018/delegates/presentation/282/) by Helminen, Tuori, Laasonen and Farinha [SN]. **High**: the only real-BIM-in, BIM-elements-out work found. [AB] Read the full text to see how validity was judged.
13. **Cross-phase product configurator for modular buildings using kit-of-parts.** Jianpeng Cao, David F. Bucher, Daniel Hall, Jerker Lessing. 2021. Automation in Construction. DOI [10.1016/j.autcon.2020.103437](https://doi.org/10.1016/j.autcon.2020.103437). PDF blocked ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0926580520310177/pdf) returned 403). Unpaywall lists it as open, CC BY-NC-ND, with an [ETH record](http://hdl.handle.net/20.500.11850/456261). **Medium**: the authored counterpart to mined modules. [AB]
14. **A graph-based approach for module library development in industrialized construction.** Jianpeng Cao, David F. Bucher, Daniel Hall, Mike Eggers. 2022. Computers in Industry. DOI [10.1016/j.compind.2022.103659](https://doi.org/10.1016/j.compind.2022.103659). PDF blocked ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0166361522000562/pdf) returned 403). CC BY-NC-ND per Unpaywall, with an [ETH record](http://hdl.handle.net/20.500.11850/541809). **Medium**: extends the 2021 module work. [AB]
15. **Automated generative design and prefabrication of precast buildings using integrated BIM and graph convolutional neural network.** Kexin Li, Vincent J.L. Gan, Mingkai Li, Maggie Y. Gao, Robert L.K. Tiong, Yaowen Yang. 2024. Developments in the Built Environment. DOI [10.1016/j.dibe.2024.100418](https://doi.org/10.1016/j.dibe.2024.100418). PDF blocked (ScienceDirect 403). CC BY-NC per OpenAlex, while Crossref lists only Elsevier's text-mining license. **Medium**: BIM graph, GCN and IFC together, with training data unknown. [AB]
16. **Generation Method for HVAC Systems Design Schemes in Office Buildings Based on Deep Graph Generative Models.** Hongxin Wang, Ruiying Jin, Peng Xu, Jiefan Gu. 2024. Buildings 14(11). DOI [10.3390/buildings14113405](https://doi.org/10.3390/buildings14113405). PDF blocked ([MDPI](https://www.mdpi.com/2075-5309/14/11/3405/pdf) returned 403). CC BY. **Medium**: generators learning design logic from BIM-based data, for one subsystem. [AB]
17. **Advancing Graph-Based Hybrid Modularization for Integrated Decisions on Volumetric Modules and Panelized Walls.** Sebastian Valencia Zapata, Heung Jin Oh, Soowon Chang. 2026. ASCE Construction Research Congress. DOI [10.1061/9780784486979.093](https://doi.org/10.1061/9780784486979.093). OpenAlex lists no open copy, and I found no legal open PDF. **Medium**: heuristic decomposition of a conventional BIM. [AB]
18. **Space Usage Knowledge Extraction from BIM Data by Decision Tree and Expert System.** Ocheol Kwon, Joowon Cho. 2019. Korean Journal of Computational Design and Engineering. DOI [10.7315/cde.2019.126](https://doi.org/10.7315/cde.2019.126). OpenAlex lists no open copy, and I did not find one. **Medium**: extracts layout rules from BIM data. [AB]
19. **Applying shape grammar and BIM for generating the mass modular housing design in ShanLiChenJia village, ZhaoYuan, China.** Jiang Wang, Jiandong Zhou, Sheng Zhang. 2023. JAABE. DOI [10.1080/13467581.2023.2292081](https://doi.org/10.1080/13467581.2023.2292081). PDF blocked ([Taylor & Francis](https://www.tandfonline.com/doi/pdf/10.1080/13467581.2023.2292081) returned 403). CC BY per Unpaywall's publisher record, with DOAJ listing CC BY-SA, so check before reuse. **Low**: hand-written grammar to Revit, a contrast case. [AB]
20. **Reincarnate D3.3 – Parametric Design Tool for Reused Building Parts and Recycled Materials.** Begum Aktas. 2025. Project deliverable, Zenodo. DOI [10.5281/zenodo.17856559](https://doi.org/10.5281/zenodo.17856559). Zenodo returned 403 to scripts, so PDF not confirmed. CC BY per OpenAlex. **Low**: reuse matching with real components, no learning. [AB]
21. **3D reconstruction of building interiors based on scan-to-BIM and generative design for as-built building.** Weilang Cai, Dongqi Hua, Sihao Li, Shiwei Xue, Zhao Xu. 2024. ECAM. DOI [10.1108/ecam-07-2024-0984](https://doi.org/10.1108/ecam-07-2024-0984). No PDF checked. **Low**: renovation context, but no learning from BIM. [SN, part of the abstract from Crossref]
22. **Graph-based retrieval of building information models for supporting the early design stages.** Christoph Langenhan, Markus Weber, Marcus Liwicki, Frank Petzold, Andreas Dengel. 2013. Advanced Engineering Informatics. DOI [10.1016/j.aei.2013.04.005](https://doi.org/10.1016/j.aei.2013.04.005). No PDF checked. **Medium**: retrieval stage from BIM, relevant to the case-based route. [SN]

**Checked and rejected: they sound close and are not**

- [Kim et al. 2024, eCAADe](https://papers.cumincad.org/data/works/att/ecaade2024_223.pdf): point clouds to BIM objects [EX].
- [Chen & Peng 2025, CAADRIA](https://papers.cumincad.org/data/works/att/caadria2025_673.pdf): GANs produce thermal images for energy retrofit, with no generation of BIM elements [EX].
- [Lacroix et al. 2023, eCAADe](https://papers.cumincad.org/data/works/att/ecaade2023_204.pdf): deep learning parses plan images, and Grasshopper then models them in BIM [EX].
- [Jabi & Li 2024, eCAADe](https://doi.org/10.52842/conf.ecaade.2024.1.675): GNN node classification [AB].
- [Hosseynzadeh et al. 2026](https://doi.org/10.5281/zenodo.20788323): 73,303 IFC4 residential models, generated by a rule-based pipeline, not learned. Possibly useful as data [AB].
- [Abey & Jopaul 2026](https://doi.org/10.5281/zenodo.23117635): 2D plans to IFC by diffusion. It reports 97.6% IFC-compliant, but its input is drawings, and the venue is unfamiliar to me [AB].
- [Ghannad & Lee 2022](https://doi.org/10.1061/9780784483893.073): GAN and BIM for modular housing. The part of the abstract I read does not mention training on BIM models [AB].
- [Pan et al. 2022](https://doi.org/10.1155/2022/3746393): retracted [AB].

### Inferences
- If a reader challenges the gap, Helminen, Cao & Hall and Sydora & Stroulia are the works to cite and distinguish. Bielski et al. should be cited as an announced but undelivered precedent, and the TUM group is worth contacting directly.
- The strongest differentiator for the thesis is the combination of independent real models and output as a whole building validated as IFC. No single stage is the novelty.

### Gaps
- Open-access status of items 13, 14, 15, 16, 19 and 20 comes from indexes, because the hosts refused scripts. Check them in a normal browser before citing them as open.
- Helminen's validity claim is the author's, and I could not see how it was tested.
- I found no evidence on whether the TUM group delivered its variant generation in a paper that does not mention BIM in the title.
