# Recommended papers: reading notes

Eight PDFs from `I:\My Drive\MaCAD Thesis\Papers`, read for the MaCAD thesis.
The thesis thread they are read against: *testing different ways of generating information models: manual → rule-based → optimization → LLM+MCP → ML*.
The working hypothesis: rule sets can assemble synthetic datasets of architectural information models to train ML, instead of relying on scraped or hand-cleaned data.

Conventions:
- Citations come from the PDF itself. When the PDF does not print a venue or an identifier, that is said, and the file name is given as the only other clue.
- Numbers are quoted as the paper states them. Anything marked *(inference)* is my reading, not the authors' claim.
- "Theoretical" = mainly useful for framing the argument (why, what a dataset must contain). "Practical" = a built pipeline, tool or dataset that can be compared with the case study.

---

## 1. ProcTHOR: procedural generation as a dataset engine

**Citation.** Deitke, M., VanderBilt, E., Herrasti, A., Weihs, L., Salvador, J., Ehsani, K., Han, W., Kolve, E., Farhadi, A., Kembhavi, A., Mottaghi, R. (2022). *ProcTHOR: Large-Scale Embodied AI Using Procedural Generation.* arXiv:2206.06994v1 [cs.AI], 14 Jun 2022. PRIOR @ Allen Institute for AI / University of Washington. Venue: not stated in the PDF.

**Question.** Can procedurally generated environments do for Embodied AI what massive datasets did for vision and language? Hand-built scenes (3D artists) and 3D scans do not scale.

**Method.** A framework built on AI2-THOR. From a *room spec* (a hand-written tree, e.g. "1 bedroom connected to 1 bathroom, 1 kitchen, 1 living room", with growth weights per room), it uses multi-stage conditional sampling:
1. Sample an interior boundary: a rectangle, then up to 10 rectangular corner cuts.
2. Subdivide it recursively into rooms, using the constrained-growth algorithm of Lopes et al. (2010).
3. Connect rooms by user-defined constraints.
4. Place assets: large objects, then wall objects, then surface objects, using soft rules such as "fridge along a wall" and *Semantic Asset Groups* such as a table with 4 chairs.
5. Sample materials and lighting.

A **validator** checks each house: a BFS over a 0.25 m grid must find at least 5 reachable positions in every room. If it fails, the house is resampled from the same room spec, "so as to not change the distribution of room specs". Houses are stored as JSON.

**Data.** Fully synthetic and rule-generated. ProcTHOR-10K is 10,000 houses from 16 room specs, plus 1,000 validation and 1,000 test houses. Assets: 1,633 instances across 108 categories. The paper says the 16 specs "can result in over 100 billion layouts". The 10K houses were generated "in 1 hour on a local workstation with 4 NVIDIA RTX A5000 GPUs". ArchitecTHOR (10 houses designed by 3D artists) is kept as a test-only set.

**Key result.** Simple CNN+GRU agents trained only on RGB in ProcTHOR reach SoTA on 6 benchmarks. Zero-shot, they beat the previous SoTA on 3 of them. Examples given:
- ArchitecTHOR ObjectNav success rose from 18.5% to 31.4%.
- Rearrangement *Prop Fixed Strict* rose from 0.19 to 0.245.
- RoboTHOR ObjectNav after fine-tuning: +8.8 SPL.
- AI2-iTHOR ObjectNav after fine-tuning: 77.5% success.

A scale ablation over 10, 100, 1,000 and 10,000 houses shows test performance rising with the number of training houses.

**Limitation.**
- Stated: single-floor houses only, and the asset library is to be scaled up.
- Evident: the houses are never judged for architectural realism. Success is measured only as downstream agent performance. The room specs are written by hand, so the layout distribution is whatever the 16 specs encode.

**Relevance to the thesis.**
- Stage: rule-based → ML. This is the clearest existing proof of the hypothesis, though for robotics, not architecture.
- Type: theoretical anchor, and also a practical reference architecture (spec → generate → validate → resample → JSON).
- Hypothesis: **strong support.** Rule-generated scenes, checked by a validator, trained models that transfer to scanned and artist-made environments. Performance grew with synthetic scale.
- Caveat for the thesis: the "label" here is a task for an agent, not architectural quality. The validator is a direct analogue of the case study's checks / issues list.

---

## 2. MSD: what a realistic floor plan dataset has to contain

**Citation.** van Engelenburg, C., Mostafavi, F., Kuhn, E., Jeon, Y., Franzen, M., Standfest, M., van Gemert, J., Khademi, S. *MSD: A Benchmark Dataset for Floor Plan Generation of Building Complexes* (paper + supplementary material). Delft University of Technology / Sungkyunkwan University / independent researchers.
- Year, venue and DOI/arXiv: not stated in the PDF (file `paper_and_supplement.pdf`).

**Question.** Large floor-plan datasets (RPLAN, LIFULL) are mostly simple single-apartment layouts. Can current generators handle realistic multi-apartment building complexes?

**Method.** MSD is curated from the Swiss Dwellings dataset (Standfest et al., Zenodo 7788422, 2022). The task is defined as generation constrained on a **zoning graph** and the **building structure** (load-bearing walls and columns as a binary image). Two baselines:
- Modified HouseDiffusion: wall cross-attention, plus a GAT that predicts room types from zones.
- A U-Net conditioned by a GCN.

Metrics are MIoU and a graph-compatibility score, plus a small user study.

**Data.** Real buildings, cleaned by rules. Each cleaning step is reported with its count:

| Step | Plans removed |
|---|---|
| Residential-only filtering | 2,305 (16.6%) |
| Near-duplicate removal (one plan per plan ID) | 4,395 (31.6%) |
| Keep ≥15 areas and ≥2 "zone 2" areas | 1,541 (11.1%) |
| Further cleaning | 388 (2.8%) |

That leaves 5,372 floor plans and over 18.9K apartments. Access graphs are extracted **algorithmically**:
- An edge exists if polygons are ≤0.04 m apart ("passage"), or a door polygon is ≤0.05 m from both areas ("door" / "front door").
- Load-bearing walls are those thicker than the 60% quantile of a plan's wall thicknesses.

How the upstream Swiss Dwellings data was produced: not stated in this paper.

**Key result.**
- Near-duplicates: RPLAN 70%, LIFULL 50%, MSD <1%.
- Graph diversity (entropy over room graphs): MSD 8.02, RPLAN 4.56, LIFULL 7.79.
- Baselines do poorly. Average MIoU ranges from 10.9 to 42.4. Graph compatibility ranges from 74.4 to 87.0, so topology is kept better than geometry.
- The authors write that generated plans "often look infeasible". The same model trains fine on RPLAN, so they blame the benchmark's complexity, not the training.
- User study: 7 architects, 50 random plans each. Topology and proportions scored between 0.37 and 0.51 on a 0/0.5/1 scale.

**Limitation.**
- Stated or evident: Switzerland only (the authors say extension to other regions is in progress), residential only, and doors are not predicted.
- The near-duplicate filter keeps only the lowest floor per plan ID.

**Relevance to the thesis.**
- Stage: ML, plus the data-curation side of rule-based. The graph and structure extraction is itself a rule set.
- Type: theoretical. It states what realism requires (irregular shapes, multi-unit connectivity, structure, orientation) and gives two metrics (near-duplicate rate, graph entropy) that the thesis can apply to its own synthetic dataset.
- Hypothesis: **mixed, mostly supportive.** It supports the hypothesis in two ways:
  - Scraped datasets turn out to be highly redundant (70% / 50% near-duplicates).
  - Even "real" data needs rule-based cleaning and rule-based graph extraction.

  It challenges it too: current ML fails on complex layouts, and a synthetic set has to reach that complexity to be useful.

---

## 3. ResPlan: a scraped vector-graph dataset and what its pipeline cost

**Citation.** Abouagour, M., Garyfallidis, E. *ResPlan: A Large-Scale Vector-Graph Dataset of 17 000 Residential Floor Plans.* arXiv:2508.14006v2 [cs.CV], 4 Aug 2026. Marked "Preprint." Indiana University Bloomington.

**Question.** Existing datasets offer scale, vector geometry *or* topology, never all three in a unit-level set. Can one dataset offer all three?

**Method.** Listing images are converted to vectors in three stages:
1. Color/texture segmentation, plus OCR on the labels.
2. Contour tracing into room, wall, door and window polygons. The listed gross area anchors the metric scale.
3. Post-processing: repair or discard fragments, align openings to walls, normalize wall thickness.

Automated checks then reject degenerate, disconnected or ambiguous plans. Each plan becomes Shapely polygons plus a NetworkX graph with 4 typed edges: `via_door`, `adjacency`, `direct`, `via_window`. Three benchmarks are released: room labeling, constrained generation, and plan-to-graph extraction.

**Data.** **Scraped.** The source is public real-estate listing pages in South Asian markets; platform names are withheld.
- About 27,000 raw plans went in and 17,000 were kept (37% rejection).
- 17 classes; split 13,736 / 1,632 / 1,632.
- Audit: in a 500-plan stratified audit, 83.1% of room polygons fall within plausible per-class area ranges.
- Release: CC BY 4.0, with a takedown policy. The collection and OCR scripts are not released.

**Key result.**
- Room labeling: GraphSAGE reaches 95.1% accuracy (RF 91.4%, GB 90.8%, GCN 73.9%).
- Cross-dataset transfer: there are large gaps against RPLAN (34.4 / 25.8 pp) and MSD (70.6 / 49.6 pp). The authors conclude "the gap is structural".
- Generation:
  - CVAEs keep 99.5% of room counts but only 0.68 adjacency.
  - A layout GNN gets 0.999 adjacency but FID 63.8.
  - An unconditional DDPM gets FID 6.1.
  - In the authors' words: "pixel generation thus gives visual fidelity without structural guarantees".
  - The CVAEs degrade as plans grow: adjacency falls from 0.70 for 4–6 rooms to 0.42 for 13+ rooms.
- Plan-to-graph: shared-boundary detection recovers 98.2% of edges. Edge-type accuracy is 85.0% with gradient boosting.

**Limitation.** The paper states each of these:
- One regional tradition, so models "should not be assumed to transfer".
- Single floor, no furniture, no 3D.
- Wall thickness normalized.
- Some jagged contours left over from contour tracing.
- 6.9% near-duplicates, with 154 test plans having a near-duplicate in training.
- The provenance pipeline cannot be audited independently.

**Relevance to the thesis.**
- Stage: ML, with rule-based quality control.
- Type: practical state of the art. It is the most recent and most complete pipeline, and its schema (polygons + typed graph + metric scale) is close to an "information model".
- Hypothesis: **supportive by contrast.** It documents every cost of the scraped route: 37% rejection, OCR and vectorization noise, near-duplicates, legal workarounds, regional bias, and non-transfer. It also shows that rules (geometric checks, buffered-overlap graph construction) already do much of the labeling work.
- Its generation results show why structural guarantees matter. That is what a rule engine provides by construction *(inference)*.

---

## 4. FloorPlanCAD: real CAD drawings, labeled by hand

**Citation.** Fan, Z., Zhu, L., Li, H., Chen, X., Zhu, S., Tan, P. *FloorPlanCAD: A Large-Scale CAD Drawing Dataset for Panoptic Symbol Spotting.* Alibaba Group / Simon Fraser University.
- Year, venue and arXiv id: not printed in the PDF. The file name is `2105.07147v2`. Dataset: https://floorplancad.github.io/

**Question.** Symbol spotting in CAD drawings needs large annotated vector data. Can spotting be done on vector graphics, for both countable "things" (doors, toilets) and uncountable "stuff" (walls, parking)?

**Method.**
- `.dwg` files are parsed to `.svg`.
- Each floor plan is split by layer to make annotation easier.
- Line-grained annotation covers 35 object categories.
- The paper defines a new task, *panoptic symbol spotting*, with a metric weighted by arc length.
- The model, PanCADNet, combines a CNN backbone with a GCN head over graphical entities (lines and arcs as nodes, with edges where endpoints are within 100 mm) and a detection head.

**Data.** **Real industry drawings, manually annotated.**
- Over 100 projects (residential, schools, hospitals, shopping malls, offices, underground parking) "from public repositories of real-world architecture projects", giving about 2,500 individual floor-plan files.
- Annotation: "11 specialists spend over 1,000 hours".
- For privacy, sensitive fields are removed and plans are cut into 10 m × 10 m blocks, of which "only 30% of the blocks are kept".
- Split by project: 10,161 training and 5,502 test drawings, 15,663 in total.

**Key result.**
- Semantic spotting: the GCN-based method reaches F1 0.806 against 0.688 for the best CNN (DeepLabv3+ R101). The paper puts the gain at 11.8% F1 and 8.4% weighted F1. Walls: 0.814 against 0.634.
- Classic template methods (SCIP, graph matching) "perform poorly" because drawings come from many vendors with no standard templates.

**Limitation.**
- Stated: some background elements are misclassified by the predicted boxes. Instance proposals should be generated in vector space.
- Evident: texts are removed and only 30% of blocks are kept, so whole-building context is lost. Annotation cost is very high.

**Relevance to the thesis.**
- Stage: manual → ML.
- Type: practical state of the art, and the closest to the case study's input. The tool reads DXF sites, and this paper works on vector CAD with walls and parking.
- Hypothesis: **supportive by contrast.** It quantifies the manual route (11 people, over 1,000 hours, 70% of the data discarded for privacy). A rule engine produces the same entity-level labels at no extra cost, because it knows what it placed *(inference)*.
- It also shows that vector + graph representations beat raster ones, which favors exporting the engine's JSON as graphs.

---

## 5. Pinki et al.: rule-based dissection on a given boundary

**Citation.** Pinki, P., Shekhawat, K., Goswami, D., Jain, U. (2024). *Generation of Dimensioned Floor Plans for a Given Boundary Layout.* Journal of Soft Computing in Civil Engineering, 8(3), 87–106. https://doi.org/10.22115/scce.2023.377613.1583

**Question.** Most floor-plan generation assumes rectangular, dimensionless boundaries with no open spaces. Can dimensioned plans be generated inside arbitrary boundaries, including slanted edges and atriums?

**Method.**
- A Python/Tkinter GUI. The user draws a rectangular plot, picks boundary points (slanted or rectilinear) and interior points (atriums).
- The user then recursively dissects blocks horizontally or vertically, entering a dimension at each step. This is a slicing tree.
- Each block stores its parent, children, size, slice type and corners. Leaves become rooms.
- Infeasible dimensions are rejected.

**Data.** None. There is no dataset and no learning. The method is shown by regenerating two Palladian plans (Villa Badoer, Palazzo Della Torre) under published constraints, plus six example plan types.

**Key result.** Qualitative only: the prototype can produce rectangular, orthogonal and non-rectangular dimensioned plans, with or without open spaces, including symmetric ones. No quantitative results are given.

**Limitation.** The paper states these:
- The user must decide every dissection and its dimensions.
- No adjacency constraints.
- No circulation.
- No qualitative evaluation by architects.

The paper's future work is to automate dissection with architectural rules (e.g. "a bedroom must have a window and it must be at least 8 feet wide").

**Relevance to the thesis.**
- Stage: manual → rule-based. It sits exactly at the step where the case study begins.
- Type: practical but modest, an academic prototype.
- Hypothesis: **neutral, but a useful foil.** It shows the slicing-tree family of rule-based generators and its stated next steps (rules, adjacency, circulation), which the case study already covers for industrial buildings. It does not discuss datasets or ML.

---

## 6. CubiCasa5K: the cost of manual annotation

**Citation.** Kalervo, A., Ylioinas, J., Häikiö, M., Karhu, A., Kannala, J. (2019). *CubiCasa5K: A Dataset and an Improved Multi-Task Model for Floorplan Image Analysis.* arXiv:1904.01920v1 [cs.CV], 3 Apr 2019. Aalto University / CubiCasa Inc. Venue: not stated in the PDF. Data and code: https://github.com/CubiCasa/CubiCasa5k

**Question.** Floor-plan parsing lacks representative datasets: the largest previous one had fewer than 1,000 images. Can a larger, densely annotated dataset plus a better multi-task CNN improve raster-to-vector parsing?

**Method.** A ResNet-152-based hourglass network with two segmentation heads (rooms, icons) and 21 heatmaps (wall junctions, icon corners, opening endpoints). Its loss weights the tasks automatically by uncertainty (Kendall et al.). A heuristic post-processor rebuilds walls, rooms, icons and openings as polygons.

**Data.** **Manual.** It is a by-product of CubiCasa's partially manual vectorization service for real-estate marketing material, mostly from Finland.
- 5,000 plans were selected from 15,000: 3,732 high-quality architectural, 992 high-quality, 276 colorful.
- Over 80 categories, annotated as SVG polygons by trained annotators.
- Each image took "from 5 to 120 minutes", followed by two-stage QA.
- Split 4,200 / 400 / 400.

**Key result.**
- On the dataset of Liu et al., their model improves on the reported baseline (e.g. junction accuracy 82.4 vs 75.5 under their evaluation without IP).
- On CubiCasa5K, test scores are:

| Target | Overall acc | Mean acc | Mean IoU |
|---|---|---|---|
| Rooms | 82.7 | 69.8 | 57.5 |
| Icons | 97.6 | 61.5 | 55.7 |

- After polygonization, room mean IoU falls to 49.3 and icon mean IoU to 41.6. Missed junctions break the polygons.

**Limitation.**
- No explicit limitations section.
- Evident: mostly one country (Finland), raster input only, and annotation cost scales linearly with images.
- The experiments use 12 room and 11 icon classes, not the full 80+.

**Relevance to the thesis.**
- Stage: manual → ML.
- Type: practical, a baseline and a citation for annotation cost.
- Hypothesis: **supportive by contrast.** It is a clean, citable number for the cost of the manual route (5–120 min per plan). It is also a reminder that much ML effort goes into *recovering* structure that rasterization destroyed. A rule engine never loses that structure.

---

## 7. Park et al.: scraping a training set, and a critique of rule-based plans

**Citation.** Park, H., Gu, H., Hong, S., Choo, S. (2024). *Developing a Robust Training Dataset for AI-Driven Architectural Spatial Layout Generation.* Applied Sciences, 14(16), 7095. https://doi.org/10.3390/app14167095

**Question.** Architectural data are complex and inconsistently drawn. How can a uniform, vector-based training dataset of spatial relationships be built for AI layout generation?

**Method.**
1. Crawl raster floor plans.
2. Define 21 classes (16 space classes and 5 "central" classes: door types, window, opening) and 3 adjacency cases (fully open, partially open, indirectly connected via a wall or door).
3. Annotate bounding boxes with a custom tool.
4. Train YOLOv3.
5. Use an algorithm to turn detections into spatial relationship ("bubble") diagrams and vector rows: space name, area ratio and area, door/window flags, and a weighted adjacency matrix with weights 1 / 0.5 / 0.25.

The tool is called *AIBIM_Bubblemaker*; the dataset is *AIBIM_House*.

**Data.** **Scraped, then manually annotated.**
- Source: the 'Houseplans' website (14,970 projects).
- 10,000 raster images were collected from 6,900 projects.
- Training/test split 5,524 / 1,380 (8:2).
- The abstract describes the result as "10,000 data rows, categorized into 21 classes and three spatial relationship categories".

**Key result.**
- Detection rate 99%, mAP 85%, MIoU 74.2%.
- Average precision is 0.873 for space classes and 0.89 for central classes. Laundry (0.723), utility (0.728) and pantry (0.747) score lowest.
- 686 of 52,253 ground-truth instances were not detected.
- The authors claim their result "marginally outperformed previous studies".

**Limitation.**
- Stated: open spaces and stair connections were hard (fixed with extra classes). More floor plans should improve accuracy. Polygon or segmentation labels would add granularity.
- Evident:
  - Only US house plans from one website.
  - Bounding boxes cannot describe non-rectangular rooms.
  - Room areas are estimated from ratios and the crawled total area.
  - The comparison with previous studies spans different datasets.
  - The extraction program is only "available upon request".

**Relevance to the thesis.**
- Stage: manual/scraped → ML. It names LLMs as a future use of the dataset.
- Type: theoretical in its framing (the dataset bottleneck in architecture); weak as a practical reference.
- Hypothesis: **the one direct challenge.** The authors write: "A unifying aspect of prior studies is a rule-based randomly generated floor plan. However, these studies did not consider design theory or knowledge." They argue for knowledge-rich vector data taken from real plans.
- This is the objection the thesis must answer. The answer can be that the rule set *is* the encoded design knowledge (codes, typology rules, circulation checks), not random generation *(inference)*.

---

## 8. Dong et al. (EdgeGAN): a rule-based pipeline as the labeler

**Citation.** Dong, S., Wang, W., Li, W., Zou, K. (2021). *Vectorization of Floor Plans Based on EdgeGAN.* Information, 12(5), 206. https://doi.org/10.3390/info12050206

**Question.** Conventional floor-plan vectorization chains hand-designed heuristics that generalize poorly and run slowly. Can vectorization be cast as image-to-image translation?

**Method.**
- **EdgeGAN** (pix2pix-based, with a self-supervising loss term) maps a colorful floor plan to a *primitive feature map*: one channel each for walls, windows and doors, drawn as lines.
- Four criteria on a *subspace connective graph* check whether the segmented subspaces are fully connected, using the Laplacian.
- A GNN classifies subspace types from features such as window ratio, area ratio and the number of doors and windows.

**Data.** **Private and semi-automatic.**
- ZSCVFP: 10,800 colorful floor plans "provided by customers" with decorative textures; 8,800 train / 2,000 test.
- **Wall labels come from the authors' own conventional (rule-based) pipeline.** Doors and windows are annotated manually.
- When labels disagree, doors and windows are adjusted to the walls, which "will reduce the accuracy of annotations more or less".

**Key result.**
- Output quality: about 40% of outputs are Level 1 (usable with a few manual fixes), about 55% Level 2 (noise, broken lines), about 5% Level 3 (serious defects, mostly sloping walls, which had fewer than 100 training samples).
- Speed: 32 fps on an RTX 2080 Ti against 2 fps for the deep-learning pipeline; the intro says "about 15 times as fast".
- Subspace classification: GNN 84.35% accuracy against 79.66% for CART, described as "4.69% higher".

**Limitation.**
- Stated: accuracy is slightly lower than the deep-learning pipeline, especially on sloping walls. Generation and segmentation are separate stages.
- Evident: the dataset is private, and its wall labels inherit any errors of the rule-based pipeline.

**Relevance to the thesis.**
- Stage: rule-based → ML (rules produce the labels) and manual (doors, windows).
- Type: practical, a minor reference.
- Hypothesis: **partial support.** It is a working case of a rule-based pipeline acting as the labeler for a neural network. The network then runs about 15× faster than the rules: rules make the data, ML makes it fast.
- It also shows the risk. Rare cases in the data (sloping walls) fail, so a generator should deliberately cover the long tail *(inference)*.

---

## Summary table

| # | Paper | Data origin | Thread stage | Kind | Hypothesis |
|---|---|---|---|---|---|
| 1 | ProcTHOR (2022) | Synthetic, rule-generated + validator | rule-based → ML | Theoretical anchor / reference architecture | Strong support |
| 2 | MSD (year not stated) | Real (Swiss Dwellings), rule-cleaned, algorithmic graphs | ML (+ rule curation) | Theoretical | Mixed, mostly supportive |
| 3 | ResPlan (2026 preprint) | Scraped listings, OCR + vectorization, rule QA | ML (+ rule QA) | Practical | Supportive by contrast |
| 4 | FloorPlanCAD (year not stated) | Real CAD, manual (11 people, over 1,000 h) | manual → ML | Practical | Supportive by contrast |
| 5 | Pinki et al. (2024) | None | manual → rule-based | Practical (prototype) | Neutral |
| 6 | CubiCasa5K (2019) | Real raster, manual (5–120 min/plan) | manual → ML | Practical (baseline) | Supportive by contrast |
| 7 | Park et al. (2024) | Scraped + manual boxes | scraped → ML | Theoretical framing | **Challenges** ("rule-based randomly generated") |
| 8 | EdgeGAN (2021) | Private; walls labeled by a rule pipeline | rule-based → ML | Practical (minor) | Partial support |

None of the eight papers addresses the optimization or LLM+MCP stages directly. MSD frames generation as "a multi-modal constrained optimization problem", and Park et al. mention LLMs only as future work.

## Ranked shortlist: 2 theoretical + 3 practical

**Theoretical**
1. **ProcTHOR.** The core argument in one paper: procedural, rule-based generation plus a validator beats hand-made and scanned data, and performance rises with synthetic scale. Its pipeline (spec → generate → validate → resample → JSON) mirrors the case study's engine.
2. **MSD.** It defines what realism requires and gives metrics the thesis can reuse (near-duplicate rate, graph entropy, graph compatibility). It also shows that scraped sets are redundant and that SoTA generators fail on complex buildings.
   - Alternate: **Park et al.**, if the presentation needs the counter-argument ("rule-based random plans lack design knowledge") stated in someone else's words.

**Practical**
1. **ResPlan.** The newest and most complete data pipeline, with a schema close to an information model. It documents every cost of scraping, which is the best contrast case.
2. **FloorPlanCAD.** Vector CAD (DWG → SVG), non-residential typologies and parking: the closest input domain to a DXF-based industrial tool. It quantifies the cost of manual annotation.
3. **Pinki et al.** The closest *generation* method: rule-based dissection inside a given boundary. Its own future work (rules, adjacency, circulation) is what the case study already does.
   - Alternates: CubiCasa5K (annotation cost, raster baseline); EdgeGAN (a rule pipeline as labeler).

## Gaps the eight papers leave (for a web deep research)

1. **Industrial / logistics typologies.** All eight are residential or mixed-use interiors. There is nothing on warehouses, docks, truck courts, parking or site-level test fits.
2. **Site scale.** There is no dataset of building-on-site layouts (setbacks, access, yards) and no work on site boundaries from GIS or DXF.
3. **Rule-generated architectural datasets used to train ML.** ProcTHOR does this for robotics only. We need architecture-specific cases: synthetic floor plans or massing used as training data, sim-to-real transfer, and comparisons of synthetic vs real training. Also how RPLAN and SESYD (synthetic, mentioned in FloorPlanCAD) were produced.
4. **Optimization as a data generator.** Nothing covers multi-objective optimization (e.g. NSGA-II Pareto sets) used to sample datasets, or surrogate models trained on optimizer runs.
5. **LLM + tool use / MCP for layout generation.** There is nothing on LLM agents driving parametric engines, or on text-to-layout through tools.
6. **Information models beyond 2D plans.** There is no BIM/IFC-level dataset or model: none of the papers carries properties, codes or performance attributes per element.
7. **Bias and diversity of rule-generated data.** No paper measures how rule priors narrow a dataset (mode collapse to the rule set), or how to check coverage of a synthetic set against reality. MSD's graph entropy is the only metric offered.
8. **Validity and labels.** How do you label quality or code compliance for synthetic layouts? ProcTHOR's validator checks reachability only.
9. **Licensing and provenance.** Only ResPlan discusses terms of service and takedown. A systematic view of legal constraints on scraped architectural data (an argument for synthetic data) is missing.
10. **Architects in the loop.** Only MSD runs a user study (7 architects). Methods for expert evaluation of generated layouts are thin.
