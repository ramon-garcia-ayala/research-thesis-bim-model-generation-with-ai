# Availability and quality of real IFC data, and how modelers and tools affect decomposition and learning

Verification tags used throughout. **[PDF]** I read the passage in the paper's own text. **[Abstract]** I read only an abstract or repository record. **[Snippet]** search-result text only, not confirmed. **[Repo]** I read the dataset's own README, API record or landing page. **[List]** stated by a third-party index, not confirmed at the source. **[Measured]** I downloaded the files and counted entities myself with a regex scan of the STEP text (no geometry processing, so counts are only as good as that method).

Note on the three named leads: `w78-2024-paper_68.pdf` is IfcVoxNet (Luttun and Krijnen), `2076-3417/11/5/2232` is Noardo et al., "An Inspection of IFC Models from Practice", and `2075-5309/14/2/527` is Austern et al. on graph neural networks.

## What open IFC collections exist, and are they whole models or isolated elements?

### Takeaway
Openly licensed real whole-building IFC amounts to a few hundred files, and the largest single release (GNI BIM, 224 models, April 2026) is student coursework. The large "real" corpora (IFCNet, about 1,000 source models) are released as isolated elements, and I found no public large crawled corpus of whole IFC models.

### Cited Findings

| Collection | Size | Disciplines | Unit | Real? | License | Access | Tag |
|---|---|---|---|---|---|---|---|
| GNI BIM Dataset (TUM) | 224 models: 208 individual, 16 from 9 team projects; 290,877 element instances in 223 parsed files | 208 single-discipline (class mix looks architectural, my reading); 7 of 9 teams have paired arch + structural | Whole models | Student coursework | CC BY 4.0 | [Zenodo 10.5281/zenodo.19722012](https://zenodo.org/records/19722012), [GitHub](https://github.com/ZijianWang-ZW/GNI-BIM-Dataset) | Repo, Measured |
| IFCNet (RWTH) | About 1,000 source models; about 1.2M entities, 82 classes; about 290k after deduplication; IFCNetCore has 20 classes | Mixed, including MEP classes | Isolated elements | Real projects, student work, online sources | None stated in the paper | [Site](https://ifcnet.e3d.rwth-aachen.de/), [paper](https://arxiv.org/pdf/2106.09712), [code and data links](https://github.com/cemunds/ifcnet-models) | PDF, Repo |
| IFCNet++ | 9,228 objects, 11 types, capped at 2,000 per type | Common building types | Isolated elements + relational features | Not established | Dataset license not found | [Paper](https://arxiv.org/pdf/2212.00942) | PDF |
| BIMCompNet | Full set 87 IFC classes; subsets at 100, 500, 1000, 5000 per class | Per-building-type subsets | Isolated components (IFC, images, point cloud, mesh, voxel, semantic graph) | Source models not established | MIT on the Hugging Face subset; full set not checked | [Site](https://bimcompnet-606lab.xaut.edu.cn/), [HF subset](https://huggingface.co/datasets/YaMiSo1995/BIMCompNet_100-samplesubset), [code](https://github.com/Yang-Mingsong/BIMCompNet) | Repo (site itself not opened) |
| buildingSMART Community-Sample-Test-Files | 198 IFC files (171 .ifc, 27 .ifczip), 1.17 GB | Real projects (Duplex, Clinic, Schependomlaan, Esplanades, Molio) mixed with test sets | Whole models and fragments | Mixed | CC BY 4.0, per-project caveats | [GitHub](https://github.com/buildingsmart-community/Community-Sample-Test-Files); counts from [ifcsamples SOURCES](https://github.com/BIMvoice/ifcsamples/blob/main/SOURCES.md) | Repo |
| buildingSMART Certification-datasets (formerly Sample-Test-Files) | 35 .ifc, 16.4 MB, the same "Simple-Scene" per discipline and version | Arch, structural, HVAC, landscaping, bridge, electrical, plumbing, rail, road | Teaching scenes | No | CC BY 4.0 | [GitHub](https://github.com/buildingSMART/Certification-datasets); [SOURCES](https://github.com/BIMvoice/ifcsamples/blob/main/SOURCES.md) | Repo |
| Schependomlaan (TU/e) | One real housing project: design IFC, subcontractor IFCs, weekly as-planned IFCs, point clouds, event logs | Arch, flooring, walls, stairs, steel, roofs, prefab | Whole models | Yes | Conflict: README grants "scientific and academic purposes"; [Awesome list](https://github.com/nbharathik/awesome-bim-datasets) says CC BY 4.0 | [Archived repo](https://github.com/openBIMstandards/Archive-DataSetSchependomlaan), [mirror README](https://github.com/PlumpMath/DataSetSchependomlaan), DOI 10.17605/OSF.IO/NE2YU | Repo |
| KIT examples (IAI) | 3 IFC4 buildings (FZK-Haus, office, Smiley West), bridge, road | Architectural | Whole models | Described by KIT as "Phantasy" buildings | "Unrestricted use" with attribution | [IFC Wiki](https://www.ifcwiki.org/index.php?title=KIT_IFC_Examples) | Repo |
| Open IFC Model Repository (Auckland) | 130 per re3data; about 180 per a third-party list | Mixed | Whole models | Mixed | CC BY 3.0 per re3data | [Site](https://openifcmodel.cs.auckland.ac.nz/), [re3data](https://www.re3data.org/repository/r3d100012443) | Repo; downloads tested |
| BIMData R&D index | 40 BIM models, 100 IFC files, 3.7 GB, mostly IFC2x3 | Arch, MEP, others | Whole models (external links) | Mixed | Varies | [Index](https://github.com/bimdata/BIMData-Research-and-Development/blob/master/pages/IFC_FILES.md) | Repo |
| IFC-Bench V2 | 21 projects, 37 IFC models, 1,027 Q&A pairs | Arch, structural, MEP, speciality | Whole models with questions | Mixed | CC BY 4.0 on HF | [HF](https://huggingface.co/datasets/sylvainhellin/ifc-bench), [V1 repo](https://github.com/sylvainHellin/ifc-bench) | Repo |
| GeoBIM benchmark re-exports | One 5.0 GB zip of IFC re-exports | Architectural | Whole models | Source models real; files are tool re-exports | CC BY 4.0 | [Zenodo 3964368](https://zenodo.org/records/3964368) | Repo (zip contents not listed; Zenodo refused my range requests) |
| RWTH E3D DigitalHub | Coordinated arch + MEP of one real building, plus CFD variants | Arch, MEP | Whole models | Yes | MIT per list | [GitHub](https://github.com/RWTH-E3D/DigitalHub) | List |
| Common BIM Files (NIBS/WBDG) | Duplex, Office, Clinic in IFC and Revit | Arch, structural, MEP | Whole models | Reference projects | "Not specified" per list; community copy CC BY 4.0 | [WBDG](https://www.wbdg.org/bim/cobie/common-bim-files) | List |
| ResBIM (contrast case) | 1,000+ paired Revit models and floor plans, IFC version on HF | Residential units | Whole models | **Synthetic** | MIT per list | [GitHub](https://github.com/RogerLiang0725/ResBIM) | Repo |

- GitHub-hosted file counts are inflated by deliberately invalid or synthetic test files: buildingSMART ifc-gherkin-rules holds 823 .ifc named pass/fail per rule, IDS test cases hold 336 mostly tiny files, and IfcOpenShell/files holds 266 mostly bug reproductions — [ifcsamples SOURCES](https://github.com/BIMvoice/ifcsamples/blob/main/SOURCES.md).
- The community sample repository states that "most of them do not pass validity check", quoted in — [ifcsamples SOURCES](https://github.com/BIMvoice/ifcsamples/blob/main/SOURCES.md).
- Secondary indexes exist: BIMvoice ifcsamples surveyed 35 sources on 12 October 2026 and sorts files by header schema — [ifcsamples](https://github.com/BIMvoice/ifcsamples); GNI ships a CSV of 35 other sources — [GNI CSV](https://github.com/ZijianWang-ZW/GNI-BIM-Dataset); the OSArch directory lists about 100+ — [OSArch](https://wiki.osarch.org/index.php/AEC_Open_Data_directory).
- Practitioner models are hard to obtain: Noardo et al. blame "privacy and copyright issues" for their sample limit — [Noardo 2021, PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf). Austern et al. used eleven files from local architect offices — [Austern 2024, PDF copy](https://web.archive.org/web/2024if_/https://www.mdpi.com/2075-5309/14/2/527/pdf). IfcVoxNet trained on 8 public models and tested on 2 — [Luttun and Krijnen 2024](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf).
- GNI anonymization has a side effect for tool studies [Measured]: `FILE_DESCRIPTION` reads `'Redacted'` in all 208 Fundamentals files, so the exchange view is gone, while `IFCAPPLICATION` survives and still identifies the exporter — [Zenodo 19722012](https://zenodo.org/records/19722012).
- GNI tool mix [Measured]: 197 of 208 Fundamentals files are Revit and 11 Archicad; 193 are IFC4 and 15 IFC2X3 — [Zenodo 19722012](https://zenodo.org/records/19722012).

### Inferences
- Public real whole-model data is enough to pilot a decomposition pipeline and probably not enough to train a generator without augmentation. A plausible working pool is GNI (224) plus Community samples, Auckland and IFC-Bench, with heavy overlap to be deduplicated. That overlap was not quantified here.
- Tool diversity is much thinner than file counts suggest. GNI Fundamentals is about 95% Revit, and Noardo's sample was also Revit-dominated, so a model trained on these may learn Revit export conventions as if they were building knowledge.
- IFCNet-style element sets support a part library or a classifier. They discard the assembly context the thesis needs in order to learn composition, so they cannot be the main training source for generating whole buildings.

### Gaps
- I found no public, large, crawled corpus of whole IFC models. GitHub API and Zenodo keyword searches returned nothing of that kind, though both searches were shallow.
- I could not confirm whether IFCNet's source models, or IFCNet's and IFCNet++'s license terms, are available. The IFCNet site returned no readable text to my fetch.
- BIMData's links are partly stale: `duraark.eu/data-repository` returned HTTP 410, although the tib.eu copies of the KIT zips still respond. Link health across the index was not audited.
- The DigitalHub and Common BIM Files rows rest on a third-party list.

## Which studies measure modeling variability, export inconsistency or misclassification?

### Takeaway
Noardo et al. (2021) is the only direct audit of practitioner models I read, and it scores models manually on ordinal scales rather than counting elements. Inter-tool differences are measured well (GeoBIM benchmark, Lai and Deng); inter-person differences are not isolated by any study I found.

### Cited Findings
- **Noardo et al. 2021** [PDF]. 57 models from different sources and nations, provided in kind, Revit-dominated. Semantics were assessed on 39 architectural and structural models — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf).
  - Sufficient semantics (entities, attributes and proxy use combined) in only 8 of 39; only 4 models scored above 0.6 on all four semantic aspects.
  - Entities sufficiently consistent in 36 of 39, fully consistent in 23.
  - Cost calculation would be prevented for all but 5 of 39.
  - Abstract conclusion: "a high level of variability is present concerning the storage of some relevant information (such as georeferencing)".
  - Internal inconsistency to flag: the text gives both 11 and 13 installation models, and both 10 and 11 models from the Amsterdam source.
- **GeoBIM benchmark, Noardo et al. 2021** [PDF]. Volunteers tested software against three supplied models (Myran, UpTown, Savigliano). "Different IFC software with the same standardised datasets yield inconsistent results, with few detectable common patterns" — [arXiv 2007.10951](https://arxiv.org/pdf/2007.10951).
  - 28 of 43 participants reported successful export on the first dataset, 16 of 43 on the IFC4 dataset, and 15 of 43 on UpTown.
  - IfcDerivedUnit was lost completely in 7 of 16 re-exports; only two tools left the model entirely unchanged.
  - Tests recorded proxy conversions, for example ACCA Edificius loading IfcBeam and IfcCovering as proxy objects.
- **Lai and Deng 2018** [PDF]. One practical project (architectural, structural, MEP) imported and re-exported between tools. Model-A-C grew 115.9% in file size with 68,330 added entities and 1,776 added property sets. Model-B-A grew 19,388.4%. A terminal changed from IfcFlowTerminal to IfcBuildingElementProxy — [JCEM PDF](https://journals.vilniustech.lt/index.php/JCEM/article/download/6132/5586).
- **Austern et al. 2024** [PDF]. Over 42,000 elements from eleven BIM files. Training accuracy exceeded 99% and validation 98% on hidden elements of the same files, while performance on unseen files was "significantly lower and subject to a variance of over 5%". Example test scores for classic models ranged 0.778 to 0.851, and the best graph model reached 89.9% — [PDF copy](https://web.archive.org/web/2024if_/https://www.mdpi.com/2075-5309/14/2/527/pdf).
- **Lal et al. 2026** [PDF]. Deterministic checks on 300 IFC2X3 structural elements, 100 from each of three files. LoadBearing coverage was 255/300, positive Length 200/300, recognized material grade 210/300, relationship participation 300/300. File C1280 scored 55, 51 and 0 per 100 on those checks where the other two scored about 100, 80 and 100 — [Scientific Reports article in press](https://www.nature.com/articles/s41598-026-76784-3_reference.pdf).
- **Luttun and Krijnen 2024** [PDF]. "There is no idiomatic, standardized, nor universal way to decompose the physical building into a set of elements. It depends on preferences of the modeler, functionality of the tool, construction method and phase of the development." They report no misclassification rate and state "we do not have a curated ground truth as IFC models are so diverse". The Molio test model has 2,066 railings and 564 stair flights because "every bar and riser is modelled individually" — [W78 2024](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf).
- **Noardo et al. 2022** [PDF]. "Designers can follow their own specific unofficial rules when modeling, and on the other hand, software can implement IFC in different ways". In one tower, car parking is 57 proxies with a property while bike parking is IfcSpace, and a figure shows an IfcWall that should be a door — [arXiv 2011.03117](https://arxiv.org/pdf/2011.03117).
- **Koo et al. 2019** [Abstract]. SVM trained on 4,187 unique elements from six architectural models, first across eight IFC classes and then subtypes; results reported as high without figures in the abstract. Measures a checker, not a field error rate — [Seoul Tech record](https://pure.seoultech.ac.kr/en/publications/using-support-vector-machines-to-classify-building-elements-for-c/).
- **Bloch and Sacks 2018** [Abstract]. Room-type classification: machine learning worked and rule inferencing "proved to be unsuitable for this problem". It does not measure model dirtiness — [CRIS record](https://cris.iucc.ac.il/en/publications/comparing-machine-learning-and-rule-based-inferencing-for-semanti/).
- **Lee, Eastman and Lee 2015** [Abstract]. Surveys six validation tools and groups validation into schema syntax, MVD conformity and rule checking. I found no per-tool error rate at abstract level and could not read the full text — [LSU record](https://repository.lsu.edu/construction_management_pubs/332).
- **Jabin, Dimyadi and Amor 2019** [Abstract in PDF]. "Current conformance tests for BIM data exchange standards are not reliable", and they do not conform to measurement theory — [W78 2019](https://cumincades.scix.net/pdfs/w78-2019-paper-030.pdf).
- **Wu et al. 2020** [PDF]. "There is no universal method among architects when creating their models" in nesting and overlap, but the ten test models were created by the authors, so this is an assertion rather than a measurement — [manuscript copy](https://web.archive.org/web/2023if_/https://par.nsf.gov/servlets/purl/10300533).

### Inferences
- The within-file versus between-file gap in Austern et al. is the best available quantitative signal of between-project heterogeneity for learning. Roughly, near-perfect scores drop to 78-92% on unseen files. This is my reading: the authors attribute it to small datasets, and a small dataset and real heterogeneity cannot be separated with eleven files.
- Evaluation must split by project or file. Random element splits will overstate performance.

### Gaps
- No study I found controls for modeler identity while holding building and tool fixed.
- Lee and Eastman's and Koo's full texts were not read because no legal copy was reachable, so quantitative content in them may exist that I did not see.
- buildingSMART's validation service produces tool scorecards from user uploads, but I found no public aggregate failure rates by tool — [Validation service](https://www.buildingsmart.org/users/services/validation-service/) [Snippet]. Noted as a gap, not as evidence of absence.

## Are there quantitative figures such as percent misclassified as IfcBuildingElementProxy or missing properties?

### Takeaway
I found no published percentage of elements misclassified as proxy across a corpus. My own count over GNI gives a skewed picture: median proxy share of 0.5% per file but 29% at the 90th percentile, and proxy is not the same as misclassified.

### Cited Findings
- Noardo et al. score proxy use ordinally (1 none, 0.9 present but correct, down to 0 all proxies) rather than as a percentage, and describe "the wide use of the generic class IfcBuildingElementProxy in most of the models" — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf).
- Other Noardo model-level counts [PDF] — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf):
  - Planar georeferencing completely wrong in 24 of 57, highly approximated in 7 more, often probably from a default US location near Boston.
  - IfcMaterial filled somehow in 33 of 57, very inaccurate in 11 of 57.
  - Materials sufficient in 30 of 39.
  - IfcOpening well used in 27 of 39.
  - Geometric intersections visible in at least 23 models.
  - IfcSite contained all objects regardless of meaning in 45 of 57.
- **GNI proxy share, 208 Fundamentals files** [Measured]. Share is IfcBuildingElementProxy over a selected set of 26 physical element classes (walls, slabs, roofs, columns, beams, doors, windows, stairs, railings, coverings, curtain walls, members, plates, footings, piles, ramps, furniture, parts, some MEP terminals and segments), so it is not the same denominator as GNI's published 290,877 — [Zenodo 19722012](https://zenodo.org/records/19722012).
  - Pooled: 18,498 of 214,405, or 8.6%.
  - Per file: median 0.5%, 75th percentile 9.7%, 90th percentile 29.2%, maximum 78.6%.
  - 85 files have no proxies at all; 68 exceed 5%; 26 exceed 25%.
  - Revit (n=197) median 0.6%, Archicad (n=11) median 0%. The Archicad sample is too small to compare.
- **GNI proxy share, 16 Project files** [Measured]. Pooled 2.3%; architectural files ranged 0.1% to 60.6% (an Archicad file, 394 of 650), and six of seven structural files had zero proxies while the SOFiSTiK export had 5.4% — [Zenodo 19722012](https://zenodo.org/records/19722012).
- IFCNet records that proxies "could have moved into" other classes during manual relabelling, and notes properties "might also be inaccurate or simply wrong" and appear in German, English, Dutch and French, but publishes no misclassification rate — [IFCNet](https://arxiv.org/pdf/2106.09712).
- Naive geometric deduplication cut IFCNet from about 1.2M to about 290k entities, which removes about 76% — [IFCNet](https://arxiv.org/pdf/2106.09712).
- 80,437 of the 214,405 counted GNI elements (37.5%) are IfcMember or IfcPlate [Measured]. GNI's README likewise says most instances are structural framing and openings or proxy components — [GNI](https://github.com/ZijianWang-ZW/GNI-BIM-Dataset).
- Missing-property evidence is small-sample. Lal et al.: no positive Length on 100 of 300 elements — [Lal 2026](https://www.nature.com/articles/s41598-026-76784-3_reference.pdf). Mahbod et al., one model: geometry generally complete while "material and thermal properties were frequently missing" — [EC3 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_235.pdf).

### Inferences
- Proxy share is a highly skewed, file-level problem rather than a uniform dirt level, so filtering or down-weighting a minority of files may remove much of the issue. The 8.6% pooled figure is driven by that tail.
- My proxy counts are an upper bound on nothing and a lower bound on nothing: legitimate proxies inflate them, and wrong non-proxy labels (a slab stored as IfcWall, as Noardo reports) are invisible to them. They measure usage, not error.
- Element counts are dominated by repetition and by exporter decomposition. I suspect the IfcMember and IfcPlate mass in GNI comes largely from curtain-wall mullions and panels and from framing, which I did not verify. A learner weighted by instance count would be pulled heavily toward these classes.

### Gaps
- No corpus-level, manually verified misclassification rate exists in what I read. Producing one on a GNI sample would be new and useful.
- GNI is student work under one teaching context, so its proxy rates should not be generalized to practice.

## Is there evidence against the "dirty because different people model differently" hypothesis?

### Takeaway
Yes, in part. The dirtiness is real and well documented, but the attribution to people is unproven and competes with exporter defaults, tool and phase. Primary-element counts can also be very stable across tools for a simple building.

### Cited Findings
- Same tool, different people: "Models exported by the same software by different participants (e.g. the two coming from Revit, the two coming from ArchiCAD) present very similar results in the number of entities, although not exactly the same" — [GeoBIM Part I](https://arxiv.org/pdf/2007.10951). This tests export by different people, not independent modeling.
- Defaults rather than intent: Noardo et al. attribute spatial-structure patterns "probably" to the "defaults export settings of software" and wrong locations to software defaults — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf).
- Multiple named causes: IfcVoxNet lists "authoring tool and version; modeler choices; level of development, phase and intended use of the model; type of construction project" — [W78 2024](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf). Noardo also adds that IFC's flexibility "allows several interpretations" that are all format-compliant — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf).
- Quality is better than the headline: "a high percentage of the IFC entities represented in the models presented high consistency", "the information was stored with quite good care in many models", and "the models usually looked good" — [PDF copy](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf).
- Labels carry learnable signal across sources: IFCNet reports strong geometry-only classification with balanced accuracy of 85.54 for MVCNN [Snippet] — [IFCNet](https://arxiv.org/pdf/2106.09712); BIMCompNet reports F1 near 89 for MVCNN at 5,000 per class [Repo] — [BIMCompNet](https://github.com/Yang-Mingsong/BIMCompNet); Austern reaches 89.9% on unseen files [PDF] — [PDF copy](https://web.archive.org/web/2024if_/https://www.mdpi.com/2075-5309/14/2/527/pdf).
- FZK-Haus across tools shows identical primary-element counts (next section) [Measured] — [Auckland repository](https://openifcmodel.cs.auckland.ac.nz/).
- 85 of 208 GNI Fundamentals files contain no proxies [Measured] — [Zenodo 19722012](https://zenodo.org/records/19722012).

### Inferences
- A more defensible thesis statement is: "IFC models are heterogeneous because the standard permits several valid encodings, and tools, defaults, phase and people each select among them; the relative contribution of people is unmeasured." The word "dirty" also merges two different things: **errors** (wrong class, wrong location) and **legal variation** (a roof as IfcRoof or as slabs). A decomposition method should treat them differently, repairing the first and representing the second.
- High classifier accuracy does not disprove dirtiness. Noisy labels can still be learnable, and shared Revit conventions can inflate agreement. It does argue against the labels being unusable.
- The evidence for and against comes from small, non-random samples. Publication also favors problem-reporting, so the balance of the literature is not a fair estimate of the true rate.

### Gaps
- No controlled test of the person effect exists in what I found, which means neither the hypothesis nor its negation is established.
- Whether modeling conventions have converged in recent exporters is unknown. The FZK-Haus evidence below spans 2006 to about 2016 and says nothing about current tools.

## Is there any dataset where the same building is modeled by different people or tools?

### Takeaway
By different **tools**: yes, small and old. By different **people**, independently and under controlled conditions: **I found none.** The closest possible candidate is GNI's 208 Fundamentals models, whose relationship to a shared brief remains unconfirmed.

### Cited Findings
- **buildingSMART German chapter IFC-Anwenderhandbuch.** "To ensure comparability, the same construction project was created by all participating programs" (my translation). Listed: AutoCAD Architecture, Revit Architecture, Bentley Architecture, ArchiCAD, EliteCAD, Allplan, Vectorworks, plus AutoCAD MEP, DDS-CAD and ETU Energieberater — [archived page, 2012](https://web.archive.org/web/2012/http://www.buildingsmart.de/2/2_02_01.htm). IFC Wiki describes "a three story detached house modelled in five big CAAD systems - original data files and exported IFC files are available" — [IFC Wiki Examples](https://www.ifcwiki.org/index.php?title=Examples). Access required a free login request in 2012, and I did not establish whether the files can still be obtained.
- **FZK-Haus** [Measured]. Header paths show one folder tree, `COMPLETE-BUILDINGS\FZK-MODELS\FZK-Haus\ArchiCAD-11\` and `...\ADT-2005-2006\`, confirming the same building in different tools. Files: [AC11 IFC2X3](https://openifcmodel.cs.auckland.ac.nz/api/download/231110AC11-FZK-Haus-IFC.ifc), [Architectural Desktop IFC2X_FINAL](https://openifcmodel.cs.auckland.ac.nz/api/download/231110ADT-FZK-Haus-2005-2006.ifc), [Archicad 20](https://www.ifcwiki.org/images/e/e3/AC20-FZK-Haus.ifc). My AC20 counts match Table 1 in [Luttun and Krijnen](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf). BIMData also lists `FZK_HausNem` and `FZK_HausEliteCAD` but gives empty source links — [BIMData index](https://github.com/bimdata/BIMData-Research-and-Development/blob/master/pages/IFC_FILES.md).

| Count | ArchiCAD 11 | Architectural Desktop | Archicad 20 |
|---|---|---|---|
| Storeys, spaces | 2, 7 | 2, 7 | 2, 7 |
| IfcWallStandardCase | 13 | 13 | 13 |
| Doors, windows, openings | 5, 11, 17 | 5, 11, 17 | 5, 11, 17 |
| Stair, railings | 1, 2 | 1, 2 | 1, 2 |
| Slabs, IfcRoof | 4, 0 | 2, 1 | 4, 0 |
| Beams, columns | 51, 1 | 0, 0 | 4, 0 |
| Furnishing, proxy | 15, 0 | 6, 4 | 0, 0 |
| Property sets, single values | 106, 295 | 113, 668 | 306, 4,451 |
| Faceted breps, mapped items | 143, 58 | 83, 8 | 140, 56 |
| Space boundaries | 98 | 65 | 81 |
| Total instances | 82,335 | 52,255 | 44,249 |

- **GeoBIM re-exports.** The same supplied models pushed through many tools, public as a 5.0 GB archive under CC BY 4.0, with participant reports alongside — [exports](https://zenodo.org/records/3964368), [reports](https://zenodo.org/records/6470370). These are re-exports rather than re-modeling, and I did not open the archive.
- **GNI paired models** [Repo, Measured]. 7 of 9 teams have architectural and structural models of one building. Storey counts disagree in 5 of 7 pairs (9/1, 6/8, 8/10, 5/7, 4/5); pairs 3 and 5 match (5/5, 0/0) — [Zenodo 19722012](https://zenodo.org/records/19722012). Different disciplines may legitimately use different levels, so this is not an error count.
- **GNI's 208 Fundamentals models, unresolved.** The README says "208 single-discipline IFC of a specific shape building", which could imply a shared brief — [GNI](https://github.com/ZijianWang-ZW/GNI-BIM-Dataset). Against it [Measured]: all 208 have a distinct signature of storeys, walls, doors, windows and slabs; walls range 7 to 355 and doors 0 to 262. For it, weakly: 128 of 208 have 5 or 6 storeys. The README also says WS 2024/25 while Zenodo says Summer term 2025 — [Zenodo](https://zenodo.org/records/19722012).
- **Schependomlaan.** Design IFC from Archicad and as-planned IFCs re-exported from Synchro: "Synchro does not have optimal IFC exporting options, as a result the data structure in IFC is change[d]" — [mirror README](https://github.com/PlumpMath/DataSetSchependomlaan). Same building, downstream tool.
- **Lai and Deng** used a re-export matrix on one project, but I found no public release of the files — [JCEM PDF](https://journals.vilniustech.lt/index.php/JCEM/article/download/6132/5586).
- A controlled design does exist outside BIM. A 2026 building-simulation paper studies modeller variability and cites 12 modelers simulating one school building, with electricity spread of -11% to +104% and gas of -61% to +1535% [Snippet, unverified] — [Yang, Burman and Mumovic](https://doi.org/10.1177/01436244261469050).

### Inferences
- FZK-Haus is a useful small natural experiment. Enclosure and opening counts agree, while the roof, framing, furnishing, properties and geometry encoding differ. So variation concentrates where decomposition is a choice (is a roof a roof object, slabs, or 51 beams?). This is one simple house and probably one institution, so it is inter-tool and not inter-modeler evidence. The AC11 and AC20 columns also show that the **same vendor across versions** can differ a lot, which complicates any "tool effect".
- Equal counts do not mean equal geometry. I compared counts only.
- The absence of an inter-modeler dataset is a real gap the thesis could fill at modest cost. For example, N modelers could model one building from the same drawings in two tools, with element-level matching as the metric. It would give the thesis a direct test of its own hypothesis.

### Gaps
- Asking the GNI authors (Wang, Borrmann) whether the Fundamentals assignment used a common brief would settle the question. I did not run a geometric comparison because I had no IFC geometry library installed, and the course page returned no usable text.
- Availability of the five-CAAD handbook files today is unknown. The IFC Wiki says three storeys while FZK-Haus files have two storey objects, so they may be different houses.
- Whether the Duplex and Medical Clinic variants listed by BIMData (NIBS, NBU, SGD) are independent models or derivatives was not established.

## What normalization or repair methods exist before learning from models?

### Takeaway
Methods fall into five families: validation, rule or ML semantic enrichment, manual relabelling, label-free re-derivation from geometry, and syntactic normalization. All are evaluated on the task itself, and I found no study measuring their effect on a downstream generative model.

### Cited Findings
- **Validation layers.** buildingSMART's service checks STEP syntax, schema, normative rules and non-normative industry practice [Snippet] — [Validation service](https://www.buildingsmart.org/users/services/validation-service/). It accepts non-zipped .ifc up to 256 MB and does not check project-specific rules, which belong to IDS [Snippet] — [User guide](https://buildingsmart.github.io/validate/user/index.html). Validity is therefore not semantic correctness.
- **IDS.** Formalizes requirements and detects missing information; a case study found critical gaps in material and thermal properties — [Mahbod et al. 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_235.pdf) [Abstract in PDF]. Open-source IDS checking in BIMserver also exists — [Rostock record](https://purl.uni-rostock.de/rosdok/id00005846) [Title only].
- **MVD validation.** Open-standard mvdXML-based checking — [Zhang, Beetz and Weise 2015](https://itcon.org/papers/2015_2.content.00001.pdf) [Title and venue only]. Limits of conformance testing are argued in — [Jabin et al. 2019](https://cumincades.scix.net/pdfs/w78-2019-paper-030.pdf).
- **Rule-based enrichment and correction.** Foundational concept — [Belsky, Sacks and Brilakis](https://doi.org/10.1111/mice.12128) [Title only]; engine description — [SeeBridge D4.1](https://seebridge.net.technion.ac.il/files/2018/07/Deliverable41SemanticEnrichmentEngine.pdf) [Header only]. RASE-based semantic correction handles cases such as proxy-assigned bridge members and furniture — [Nisbet et al. 2024](https://discovery.ucl.ac.uk/10183047/1/1-s2.0-S1474034623004184-main.pdf) [PDF, partial]. Interdomain rules for MEP — [Utkucu and Sacks 2023](https://architektur-informatik.scix.net/pdfs/w78-2023-paper_104.pdf) [Header only].
- **ML class checking.** SVM on six models — [Koo 2019](https://pure.seoultech.ac.kr/en/publications/using-support-vector-machines-to-classify-building-elements-for-c/) [Abstract]; graph context — [Austern 2024](https://web.archive.org/web/2024if_/https://www.mdpi.com/2075-5309/14/2/527/pdf) [PDF]; relational features — [Luo 2023](https://arxiv.org/pdf/2212.00942) [PDF].
- **Manual relabelling and deduplication.** IFCNet uses a web tool and expert review, though "not all of the objects ... have been reviewed and confirmed, yet"; the authors call labelling "resource intensive" — [IFCNet](https://arxiv.org/pdf/2106.09712).
- **Discard labels and re-derive.** CBIM builds knowledge graphs "from pure building object geometries" — [Wang et al. 2023](https://arxiv.org/pdf/2304.11672) [Abstract in PDF]. IfcVoxNet voxelizes so that "the method is independent of individual modeler choices", though the authors also observe that stairs landing, window frames and podium stairs are confused — [W78 2024](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf).
- **Syntactic normalization and parsing.** Normalization for storage and versioning — [Liu, Gao and Gu 2023](https://arxiv.org/pdf/2312.14931) [Title only]; extraction to CSV and OBJ — [IFC2StructuredData](https://github.com/ZijianWang-ZW/IFC2StructuredData); dataset pipelines at model and component level — [BIMCompNet](https://github.com/Yang-Mingsong/BIMCompNet) [Repo].

### Inferences
- A practical pre-learning pipeline, in my judgment: parse and validate syntax and schema, deduplicate by geometry, flag files by proxy share and missing-spatial-structure, re-infer classes with a project-held-out classifier, then keep both source and inferred labels. Keeping both preserves the variation for study rather than erasing it.
- Voxel or geometry-only normalization solves the decomposition-choice problem by throwing away the very decomposition the thesis wants to study and regenerate. IFC output requires element boundaries, so this route would have to be paired with a separate instance-recovery step.
- Passing a validator should be a necessary filter for generation output, not evidence of quality.

### Gaps
- No study I found compares normalization methods by their effect on later learning or generation.
- Several method papers here were checked at title or header level only, as tagged. Treat them as pointers rather than verified findings.

## Which papers are recommended, with citation, access and relevance?

### Takeaway
Read Noardo 2021, GeoBIM Part I, IfcVoxNet, Austern 2024 and IFCNet first; all have a PDF I could actually retrieve. Koo 2019, Bloch and Sacks 2018 and Lee et al. 2015 have no legal open PDF that I could verify.

### Cited Findings
"PDF checked" means I received HTTP 200 and `%PDF-` magic bytes at that URL on 2026-11-08. MDPI, ScienceDirect and Wiley returned 403 to my automated requests and `pure.tudelft.nl` and `par.nsf.gov` refused the connection, so for those papers I checked a Wayback copy of the official file. The publisher URLs probably work in a normal browser. I did not test that.

| Paper (exact title; all authors; year; venue) | DOI / arXiv | PDF checked | License | Relevance | Read |
|---|---|---|---|---|---|
| An Inspection of IFC Models from Practice. Francesca Noardo, Ken Arroyo Ohori, Thomas Krijnen, Jantien Stoter. 2021. Applied Sciences 11(5), 2232 | 10.3390/app11052232 | [Wayback copy of MDPI PDF](https://web.archive.org/web/2023if_/https://www.mdpi.com/2076-3417/11/5/2232/pdf) | CC BY | **High**: the direct audit of the raw material this thesis depends on. | PDF, targeted sections |
| Reference study of IFC software support: The GeoBIM benchmark 2019 - Part I. Francesca Noardo, Thomas Krijnen, Ken Arroyo Ohori, Filip Biljecki, Claire Ellul, Lars Harrie, Helen Eriksson, Lorenzo Polia, Nebras Salheb, Helga Tauscher, Jordi van Liempt, Hendrik Goerne, Dean Hintz, Tim Kaiser, Cristina Leoni, Artur Warchoł, Jantien Stoter. 2021. Transactions in GIS 25 | 10.1111/tgis.12709; arXiv 2007.10951 | [arXiv](https://arxiv.org/pdf/2007.10951) | CC BY (OpenAlex) | **High**: strongest inter-tool evidence, with public re-exports usable as data. | PDF, targeted sections |
| IfcVoxNet: 3D segmentation and classification of voxelized IFC building models with Deep Learning. Johan Luttun, Thomas Krijnen. 2024. CIB W78 | No DOI found | [SciX](https://architektur-informatik.scix.net/pdfs/w78-2024-paper_68.pdf) | Not stated in text | **High**: states the decomposition-variability problem directly and offers a representation that sidesteps it. | PDF, full |
| Incorporating Context into BIM-Derived Data—Leveraging Graph Neural Networks for Building Element Classification. Guy Austern, Tanya Bloch, Yael Abulafia. 2024. Buildings 14(2), 527 | 10.3390/buildings14020527 | [Wayback copy of MDPI PDF](https://web.archive.org/web/2024if_/https://www.mdpi.com/2075-5309/14/2/527/pdf) | CC BY | **High**: quantifies the generalization gap between files. | PDF, targeted sections |
| IFCNet: A Benchmark Dataset for IFC Entity Classification. Christoph Emunds, Nicolas Pauen, Veronika Richter, Jérôme Frisch, Christoph van Treeck. 2021. arXiv; EG-ICE 2021 per [Snippet] | arXiv 2106.09712 | [arXiv](https://arxiv.org/pdf/2106.09712) | Not checked | **High**: the largest real-derived element dataset and a labelling method. | PDF, targeted sections |
| IFC models for semi-automating common planning checks for building permits. Francesca Noardo, Teng Wu, Ken Arroyo Ohori, Thomas Krijnen, Jantien Stoter. 2022. Automation in Construction 134, 104097 | 10.1016/j.autcon.2021.104097; arXiv 2011.03117 | [arXiv author version](https://arxiv.org/pdf/2011.03117) | CC BY (OpenAlex); author version marked personal use | **Medium**: concrete examples of inconsistent encoding within real towers. | PDF, targeted sections |
| Interoperability analysis of IFC-based data exchange between heterogeneous BIM software. Huahui Lai, Xueyuan Deng. 2018. Journal of Civil Engineering and Management 24(7), 537-555 | 10.3846/jcem.2018.6132 | [Publisher](https://journals.vilniustech.lt/index.php/JCEM/article/download/6132/5586) | CC BY (OpenAlex) | **Medium**: quantifies re-export damage, relevant if the pipeline round-trips through tools. | PDF, targeted; tables garbled in extraction |
| A Geometric-Relational Deep Learning Framework for BIM Object Classification. Hairong Luo, Ge Gao, Han Huang, Ziyi Ke, Cheng Peng, Ming Gu. 2023. ECCV 2022 Workshops | 10.1007/978-3-031-25082-8_23; arXiv 2212.00942 | [arXiv](https://arxiv.org/pdf/2212.00942) | arXiv non-exclusive | **Medium**: IFCNet++ adds relational features, one step toward assembly context. | PDF, targeted |
| Integrated architectures for IFC interoperability and legacy BIM migration with a deterministic IFC2X3 data-quality pilot. Ratan Lal, Mariam Sharif, Muhammad Tariq Bashir, Mohammad Khishe, Alemineh Sorsa, Md. Munir Hayet Khan, Ahmad Zaland. 2026. Scientific Reports, article in press | 10.1038/s41598-026-76784-3 | [Nature](https://www.nature.com/articles/s41598-026-76784-3_reference.pdf) | Not checked | **Medium**: a small but exact per-file property-coverage measurement, structural steel only. | PDF, targeted |
| CBIM: A Graph-based Approach to Enhance Interoperability Using Semantic Enrichment. Zijian Wang, Huaquan Ying, Rafael Sacks, André Borrmann. 2023. arXiv | arXiv 2304.11672 | [arXiv](https://arxiv.org/pdf/2304.11672) | CC BY-NC-SA (OpenAlex) | **High**: rebuilds semantics and graph from geometry, close to a decomposition representation. | Abstract and one table |
| Semantic correction, enrichment and enhancement of social and transport infrastructure BIM models. Nicholas Nisbet, Zijing Zhang, Ling Ma, Weiwei Chen, Mustafa Selçuk Çıdık. 2024. Advanced Engineering Informatics 59, 102290 | 10.1016/j.aei.2023.102290 | [UCL Discovery](https://discovery.ucl.ac.uk/10183047/1/1-s2.0-S1474034623004184-main.pdf) | CC BY (OpenAlex) | **Medium**: a documented repair method, including proxy correction, on real models. | PDF, partial |
| Data quality control for openBIM-based digital twins in retrofit: a case study on IFC validation and information requirements. Sarah Mahbod, Atefeh Hesarbani, Erik Poirier, Farzad Jalaei, Arash Hosseini, Mazdak Nik-Bakht. 2026. EC3 | No DOI found | [EC3](https://ec-3.org/wp-content/uploads/2026/08/EC32026_235.pdf) | Not stated | **Low**: one model, though a clear IDS example. | Abstract |
| From a meagre 'testing for interoperability' to the 'measurement of interoperability' in BIM. Joseph Jabin, Johannes Dimyadi, Robert Amor. 2019. CIB W78 | No DOI found | [SciX](https://cumincades.scix.net/pdfs/w78-2019-paper-030.pdf) | Not stated | **Low**: useful caution that certification is not a quality measure. | Abstract |
| Invariant Signatures of Architecture, Engineering, and Construction Objects to Support BIM Interoperability between Architectural Design and Structural Analysis. Jin Wu, Hezha Lutfalla Sadraddin, Ran Ren, Jiansong Zhang, Xiaoyun Shao. 2020. Journal of Construction Engineering and Management (per OpenAlex) | 10.1061/(ASCE)CO.1943-7862.0001943 | [Wayback copy of NSF manuscript](https://web.archive.org/web/2023if_/https://par.nsf.gov/servlets/purl/10300533) | Not stated | **Low**: synthetic test models, cited mainly for one statement. | PDF, targeted |
| Interoperable validation for IFC building models using open standards. Chi Zhang, Jakob Beetz, Matthias Weise. 2015. ITcon | 10.18154/rwth-conv-213541 (per OpenAlex) | [ITcon](https://itcon.org/papers/2015_2.content.00001.pdf) | "other-oa" (OpenAlex) | **Low**: background on MVD checking. | Title only |
| Using support vector machines to classify building elements for checking the semantic integrity of building information models. Bonsang Koo, Sunmin La, Nam-Wook Cho, Youngsu Yu. 2019. Automation in Construction 98, 183-194 | 10.1016/j.autcon.2018.11.015 | **No legal open PDF found** (OpenAlex: closed) | n/a | **Medium**: the first well-known ML integrity check, on a small real set. | Abstract |
| Comparing machine learning and rule-based inferencing for semantic enrichment of BIM models. Tanya Bloch, Rafael Sacks. 2018. Automation in Construction 91, 256-272 | 10.1016/j.autcon.2018.03.018 | **No legal open PDF verified** (OpenAlex: closed; a [Cambridge record](http://publications.eng.cam.ac.uk/1199782/) exists, not tested) | n/a | **Medium**: helps choose enrichment method by problem type, but concerns room types. | Abstract |
| Validations for ensuring the interoperability of data exchange of a building information model. Yong-Cheol Lee, Charles M. Eastman, Jin-Kook Lee. 2015. Automation in Construction 58, 176-195 | 10.1016/j.autcon.2015.07.010 | **No PDF reachable**: [LSU](https://repository.lsu.edu/construction_management_pubs/332) says "currently not available here" | n/a | **Low**: a validator survey, not a measurement, at abstract level. | Abstract |
| BIMCompNet: Multimodal Dataset for Geometric Deep Learning in Building Information Model. Mingsong Yang, Xinhong Hei, Kehai Chen, Haining Meng, HaoYang Dong, Qin Zhao. 2025. Venue not confirmed | 10.1145/3746027.3758238 | **No open PDF found** (OpenAlex lists no OA URL) | n/a | **Medium**: large multimodal IFC components, though the paper was not read. | Repo only |
| Semantic Enrichment for Building Information Modeling. Michael Belsky, Rafael Sacks, Ioannis Brilakis. 2015 (per OpenAlex). Computer-Aided Civil and Infrastructure Engineering | 10.1111/mice.12128 | Not tested; OpenAlex lists hybrid OA at DOI | CC BY-NC-ND (OpenAlex) | **Medium**: the root reference for rule-based enrichment. | Title only |

Also relevant, not read: Koo, Shin and Krijnen 2017, "Employing Outlier and Novelty Detection for Checking the Integrity of BIM to IFC Entity Associations", ISARC, DOI 10.22260/ISARC2017/0002, [TU/e record](https://research.tue.nl/en/publications/e138cba8-7894-4f77-94a9-311611307f6d), PDF not tested.

### Inferences
- The most reused evidence comes from a small cluster of authors (Noardo, Krijnen, Arroyo Ohori, Stoter at TU Delft). The core claims about practitioner IFC quality have thin independent replication, so the thesis should say so rather than cite them as a broad consensus.

### Gaps
- License fields marked "(OpenAlex)" come from its metadata and were not checked on the publisher's page.
- Several tables were garbled by PDF text extraction, notably Lai and Deng and the Austern graph-model rows. Check exact table values in the PDFs before quoting anything beyond the figures given here.
- Publisher copies of the MDPI papers should be re-checked by a person in a browser, since my host was blocked.
