# Assembly-based and example-based generation as a methodological basis for IFC

Scope: methods for "learn parts from examples, then assemble new wholes", and how each could transfer to IFC. IFC-to-graph decomposition, generative models trained on BIM, and data availability belong to other researchers.

**How to read the verification labels**

- **PDF-read**: I downloaded the PDF, extracted its text, and read the abstract, targeted passages (found by keyword), and the conclusion or limitations section. I did not read these papers line by line. Check quotes and details against the PDF before citing them in the thesis.
- **PDF-partial**: I read only the abstract and a few passages or the conclusion.
- **Abstract-only**: I read no full text.
- **Metadata**: authors, year, venue and DOI come from OpenAlex, Crossref or the arXiv API, cross-checked against the PDF title page where I had one.
- **PDF check**: "PDF OK" means the URL returned HTTP 200 and the bytes began with `%PDF-`. A dagger (†) means the check ran with TLS certificate verification turned off, because local certificate checks failed for several hosts. The response was still a real PDF, but the host's identity was not verified by that check.
- **Transfer assessments and ratings** are my own inferences. No paper in this set works on IFC.

## Which papers should the thesis use, and how can they be obtained?

### Takeaway
Twelve papers form the core set, and all twelve have a checked free PDF. Three of them matter most: Merrell 2023 for learned grammars with explicit cut-and-glue interfaces, Kalogerakis 2012 for automatic part synthesis with slots, and Chaudhuri 2011 for learned semantic and style compatibility. Talton 2012 is a confirmed paper, but I found no legal open-access PDF, so it sits in the reserve list.

### Cited Findings

**Core set (12)**

| # | Exact title | All authors | Year, venue | DOI / arXiv | Direct PDF (checked) | License as stated | Relevance and why | Verified |
|---|---|---|---|---|---|---|---|---|
| 1 | Example-Based Procedural Modeling Using Graph Grammars | Paul Merrell | 2023, ACM TOG 42(4) | [10.1145/3592119](https://doi.org/10.1145/3592119) | [author site](https://paulmerrell.org/wp-content/uploads/2024/02/ProcModelUsingGraphGram.pdf), PDF OK, 57 MB | No open license stated; rights licensed to ACM | **High**: it derives a graph grammar automatically from examples using labeled cuts and glues, the closest formal template for IFC graphs. | PDF-read |
| 2 | A Probabilistic Model for Component-Based Shape Synthesis | Evangelos Kalogerakis, Siddhartha Chaudhuri, Daphne Koller, Vladlen Koltun | 2012, ACM TOG 31(4) | [10.1145/2185520.2185551](https://doi.org/10.1145/2185520.2185551) | [author site](https://vladlen.info/papers/shape-synthesis.pdf), PDF OK | No open license; © ACM notice in a hosted copy | **High**: it synthesizes new wholes from existing parts automatically, from small example sets, with attachment slots extracted from the data. | PDF-read |
| 3 | Probabilistic Reasoning for Assembly-Based 3D Modeling | Siddhartha Chaudhuri, Evangelos Kalogerakis, Leonidas Guibas, Vladlen Koltun | 2011, ACM TOG 30(4) | [10.1145/2010324.1964930](https://doi.org/10.1145/2010324.1964930) | [author site](https://www.sidch.com/docs/siggraph2011_assembly.pdf), PDF OK | No open license; © ACM notice in a hosted copy | **High**: its network over labels, style clusters, adjacency, counts and symmetries maps closely to IFC classes and relations, and it reuses original parts. | PDF-read |
| 4 | Example-Based Model Synthesis | Paul Merrell | 2007, I3D, pp. 105–112 | [10.1145/1230100.1230119](https://doi.org/10.1145/1230100.1230119) | [author site](https://paulmerrell.org/wp-content/uploads/2021/06/model_synthesis.pdf), PDF OK | None stated | **High**: it gives the simplest usable coherence rule (adjacency seen in the example), and it names lattice-structured architecture as a good fit. | PDF-read |
| 5 | A Connection between Partial Symmetry and Inverse Procedural Modeling | Martin Bokeloh, Michael Wand, Hans-Peter Seidel | 2010, ACM TOG 29(4) | [10.1145/1778765.1778841](https://doi.org/10.1145/1778765.1778841) | [co-author site](https://www.staff.uni-mainz.de/wandm/papers/ProcModFromSym-siggraph2010.pdf), PDF OK† | None stated; OpenAlex lists "other-oa" | **Medium**: "docking sites" are a rigorous definition of interchangeable interfaces, but they rest on similarity under rigid motions. | PDF-read |
| 6 | Bayesian Grammar Learning for Inverse Procedural Modeling | Anđelo Martinović, Luc Van Gool | 2013, CVPR | [10.1109/CVPR.2013.33](https://doi.org/10.1109/CVPR.2013.33) | [CVF Open Access](https://openaccess.thecvf.com/content_cvpr_2013/papers/Martinovic_Bayesian_Grammar_Learning_2013_CVPR_paper.pdf), PDF OK† | © 2013 IEEE; CVF-hosted copy | **Medium**: it learns building grammars by Bayesian merging, but only for 2D labeled facades. | PDF-partial |
| 7 | WaveFunctionCollapse is Constraint Solving in the Wild | Isaac Karth, Adam M. Smith | 2017, FDG | [10.1145/3102071.3110566](https://doi.org/10.1145/3102071.3110566) | [eScholarship](https://escholarship.org/content/qt1f29235t/qt1f29235t.pdf), PDF OK | ACM permission notice; repository copy | **Medium**: it recasts WFC as constraint solving, which is the route for adding hard IFC rules, though it studies image generation. | PDF-partial |
| 8 | StructureNet: Hierarchical Graph Networks for 3D Shape Generation | Kaichun Mo, Paul Guerrero, Li Yi, Hao Su, Peter Wonka, Niloy J. Mitra, Leonidas J. Guibas | 2019, ACM TOG 38(6) | [10.1145/3355089.3356527](https://doi.org/10.1145/3355089.3356527), [arXiv:1908.00575](https://arxiv.org/abs/1908.00575) | [arXiv](https://arxiv.org/pdf/1908.00575), PDF OK | arXiv non-exclusive distribution license | **Medium**: its hierarchy plus relation edges resembles an IFC graph, but it generates new geometry instead of reusing parts. | PDF-read |
| 9 | COALESCE: Component Assembly by Learning to Synthesize Connections | Kangxue Yin, Zhiqin Chen, Siddhartha Chaudhuri, Matthew Fisher, Vladimir G. Kim, Hao Zhang | 2020, 3DV | [10.1109/3DV50981.2020.00016](https://doi.org/10.1109/3DV50981.2020.00016), [arXiv:2008.01936](https://arxiv.org/abs/2008.01936) | [arXiv](https://arxiv.org/pdf/2008.01936), PDF OK | arXiv non-exclusive distribution license | **Medium**: it addresses parts from different sources directly, but its output is a mesh joint, not semantic connections. | PDF-read |
| 10 | Graph2Plan: Learning Floorplan Generation from Layout Graphs | Ruizhen Hu, Zeyu Huang, Yuhan Tang, Oliver van Kaick, Hao Zhang, Hui Huang | 2020, ACM TOG 39(4) | [10.1145/3386569.3392391](https://doi.org/10.1145/3386569.3392391), [arXiv:2004.13204](https://arxiv.org/abs/2004.13204) | [arXiv](https://arxiv.org/pdf/2004.13204), PDF OK | arXiv non-exclusive distribution license | **Medium**: its retrieve-adjust-generate pipeline over real plans suits a topology layer, but it recombines room graphs and not building elements. | PDF-read |
| 11 | Modeling by Example | Thomas Funkhouser, Michael Kazhdan, Philip Shilane, Patrick Min, William Kiefer, Ayellet Tal, Szymon Rusinkiewicz, David Dobkin | 2004, ACM TOG 23(3), pp. 652–663 | [10.1145/1015706.1015775](https://doi.org/10.1145/1015706.1015775) | [Princeton](https://www.cs.princeton.edu/~funk/sig04a.pdf), PDF OK | None stated | **Medium**: it defines the search-cut-compose pipeline, but it is interactive and works on meshes. | PDF-read |
| 12 | Clicking Is All You Need: Implementing Wave Function Collapse in Early-Stage Design for Manufacturing and Assembly Projects | Owen Zhiyuan Lu, Leo Lin Meng, Cristina Ramos Jaime, M. Hank Haeusler | 2024, CAADRIA, vol. 1, pp. 303–312 | [10.52842/conf.caadria.2024.1.303](https://doi.org/10.52842/conf.caadria.2024.1.303) | [CumInCAD](https://papers.cumincad.org/data/works/att/caadria2024_49.pdf), PDF OK† | None seen | **Medium**: it is the closest AEC kit-of-parts case on a real project, but its rules come from guidelines, not from data, and it does not use IFC. | PDF-partial |

**Reserve list: requested or useful, but outside the core 12**

| Exact title | All authors | Year, venue | DOI / arXiv | Direct PDF | License as stated | Relevance and why | Verified |
|---|---|---|---|---|---|---|---|
| Learning design patterns with Bayesian grammar induction | Jerry O. Talton, Lingfeng Yang, Ranjitha Kumar, Maxine Lim, Noah D. Goodman, Radomír Měch | 2012, UIST, pp. 63–74 | [10.1145/2380116.2380127](https://doi.org/10.1145/2380116.2380127) | **No legal open-access PDF found.** OpenAlex, Unpaywall and Semantic Scholar all report it as closed. The [ACM PDF](https://dl.acm.org/doi/pdf/10.1145/2380116.2380127) returned 403 to my automated request, so it may still open in a browser or through a library. | Not determined | **Medium**: it takes labeled, hierarchical designs as input, which resembles IFC decomposition trees, but full text is unread. | Abstract-only, via [Illinois Experts](https://experts.illinois.edu/en/publications/learning-design-patterns-with-bayesian-grammar-induction/) |
| ComplementMe: Weakly-Supervised Component Suggestions for 3D Modeling | Minhyuk Sung, Hao Su, Vladimir G. Kim, Siddhartha Chaudhuri, Leonidas Guibas | 2017, ACM TOG 36(6), art. 226 | [10.1145/3130800.3130821](https://doi.org/10.1145/3130800.3130821), [arXiv:1708.01841](https://arxiv.org/abs/1708.01841) | [arXiv](https://arxiv.org/pdf/1708.01841), PDF OK | arXiv non-exclusive distribution license | **Medium**: it learns from uncurated, inconsistent segmentation, which is what mixed modelers will produce; it is the first substitute if a core paper drops out. | PDF-partial |
| ShapeAssembly: Learning to Generate Programs for 3D Shape Structure Synthesis | R. Kenny Jones, Theresa Barton, Xianghao Xu, Kai Wang, Ellen Jiang, Paul Guerrero, Niloy J. Mitra, Daniel Ritchie | 2020, ACM TOG 39(6) | [10.1145/3414685.3417812](https://doi.org/10.1145/3414685.3417812), [arXiv:2009.08026](https://arxiv.org/abs/2009.08026) | [arXiv](https://arxiv.org/pdf/2009.08026), PDF OK | arXiv non-exclusive distribution license | **Medium**: its attachment-based programs suggest a readable intermediate language for IFC assembly, but parts are cuboids. | PDF-partial |
| BuildingNet: Learning to Label 3D Buildings | Pratheba Selvaraju, Mohamed Nabail, Marios Loizou, Maria Maslioukova, Melinos Averkiou, Andreas Andreou, Siddhartha Chaudhuri, Evangelos Kalogerakis | 2021, ICCV | [10.1109/ICCV48922.2021.01023](https://doi.org/10.1109/ICCV48922.2021.01023), [arXiv:2110.04955](https://arxiv.org/abs/2110.04955) | [arXiv](https://arxiv.org/pdf/2110.04955), PDF OK | CC BY-NC-ND 4.0 (arXiv); ©2021 IEEE notice | **Low**: it labels building exteriors and does not generate, and IFC already carries class semantics. | PDF-partial |
| PartNet: A Large-Scale Benchmark for Fine-Grained and Hierarchical Part-Level 3D Object Understanding | Kaichun Mo, Shilin Zhu, Angel X. Chang, Li Yi, Subarna Tripathi, Leonidas J. Guibas, Hao Su | 2019, CVPR | [10.1109/CVPR.2019.00100](https://doi.org/10.1109/CVPR.2019.00100), [arXiv:1812.02713](https://arxiv.org/abs/1812.02713) | [arXiv](https://arxiv.org/pdf/1812.02713), PDF OK | arXiv non-exclusive distribution license | **Low**: it covers object categories rather than buildings, and matters here only as the annotation precedent behind StructureNet. | PDF-partial |

**Requested items checked and confirmed**: Funkhouser 2004, Chaudhuri 2011, Kalogerakis 2012, StructureNet, PartNet, BuildingNet, Talton 2012, Bokeloh 2010, Merrell 2007 and Graph2Plan all exist with the metadata above.

### Inferences
- The ratings favor methods that keep original parts intact (Chaudhuri, Kalogerakis, Merrell). Reusing an original part preserves its IFC attributes. Methods that decode new geometry (StructureNet) lose them unless the decoded result is matched back to a real part.
- The older papers are not obsolete for this topic. They operate on discrete parts with explicit relations, which is closer to IFC than recent neural mesh and implicit-surface work.

### Gaps
- Licenses: most author-hosted ACM copies state no reuse license. They are free to read but should not be redistributed in the repository without checking. I did not check ACM's self-archiving terms.
- OpenAlex lists dl.acm.org PDF links as open for some ACM papers, such as [Sandhu et al. 2019](https://dl.acm.org/doi/pdf/10.1145/3337722.3337752). Some papers listed as closed here may therefore open from ACM in a browser, but I could not confirm this because dl.acm.org blocked my automated request.

## What do assembly-based and part-based methods offer?

### Takeaway
This line moved from a human assembling retrieved parts (2004), to learned suggestions (2011), to automatic synthesis (2012), to deep models of hierarchy and relations (2019). Each step needs better-prepared input, and inconsistent decomposition is the barrier most likely to carry over to IFC.

### Cited Findings
- Modeling by Example lets a user search a database, cut parts out and composite them, with the conceptual design coming from the user and the details from the examples — [Funkhouser et al. 2004](https://www.cs.princeton.edu/~funk/sig04a.pdf).
- Its prototype used more than 10,000 models. The authors state that placing parts side by side does not yield a connected manifold surface, so the user stitches them, and they say the stitching methods are not a research contribution of the paper — [Funkhouser et al. 2004](https://www.cs.princeton.edu/~funk/sig04a.pdf).
- Chaudhuri et al. learn a Bayesian network over category labels, style clusters, part adjacencies, part counts and symmetries, and learn its dependency structure from data. Input is a semi-automatically segmented and labeled repository — [Chaudhuri et al. 2011](https://www.sidch.com/docs/siggraph2011_assembly.pdf).
- Kalogerakis et al. relate component properties to latent causes of structural variability, learned without supervision from compatibly segmented shapes. Figure 1 reports 1,267 new airplanes synthesized from 100 training airplanes — [Kalogerakis et al. 2012](https://vladlen.info/papers/shape-synthesis.pdf).
- That pipeline assumes compatible segmentation and upright, front-facing shapes, and preprocessing still required manual effort — [Kalogerakis et al. 2012](https://vladlen.info/papers/shape-synthesis.pdf).
- StructureNet encodes shapes as a hierarchy of n-ary graphs with four sibling relations: adjacency and reflective, rotational and translational symmetry. It adds losses for symmetries and adjacencies. It trained on 4,871 chairs, 5,099 tables and 862 cabinets after removing shapes with unlabeled parts — [Mo et al. 2019](https://arxiv.org/pdf/1908.00575).
- StructureNet relies on the observation that, within a category, shapes tend to have consistent part hierarchies — [Mo et al. 2019](https://arxiv.org/pdf/1908.00575). Its future work includes extending from objects to scenes — [same source](https://arxiv.org/pdf/1908.00575).
- PartNet contains 573,585 part instances over 26,671 models in 24 object categories — [Mo et al. 2019](https://arxiv.org/pdf/1812.02713).
- BuildingNet has 513K annotated mesh primitives grouped into 292K components across 2K buildings, exteriors only, mined from 3D Warehouse, with 31 labels — [Selvaraju et al. 2021](https://arxiv.org/pdf/2110.04955).
- Its authors report that watertight reconstruction could not be achieved for most building subgroups because of non-manifold geometry, disconnected or overlapping faces and open boundaries — [Selvaraju et al. 2021](https://arxiv.org/pdf/2110.04955).
- ComplementMe trains on unlabeled public repository data and needs no consistent segmentation or labels. Its conclusion states it can learn from a non-curated, inconsistent oversegmentation — [Sung et al. 2017](https://arxiv.org/pdf/1708.01841).
- ShapeAssembly builds shapes by declaring cuboids and attaching them, and extracts programs from PartNet. Its authors report that extraction does not succeed for every shape, because it assumes part orientation can be specified solely through attachments — [Jones et al. 2020](https://arxiv.org/pdf/2009.08026).

### Inferences

| Method | Transfer to IFC | What it would require |
|---|---|---|
| Funkhouser | Search, extract and compose subgraphs of IFC entities | An IFC subgraph extractor that keeps dependencies, plus a shape and semantic index |
| Chaudhuri | Suggest parts conditioned on the partial model, with a designer in the loop | Category labels from IFC classes, style clusters, and adjacency taken from IFC relations or geometry |
| Kalogerakis | Sample new sets of parts, then place them through slots | Compatible decomposition across models, slots extracted from real connections, and a placement step that prevents clashes |
| StructureNet | Latent model over the spatial hierarchy plus relation edges | Thousands of consistent samples per typology, and a decoder that retrieves real parts |
| ComplementMe | Learn fit between parts without a shared part taxonomy | A workable self-supervised setup, with buildings as the "shape" |

- Real IFC already gives what these methods work hard to obtain: instance boundaries and class labels. So part segmentation should be easier than for meshes.
- Decomposition *consistency* is a different matter. I expect different modelers to divide and name the same building logic differently. That would violate the "compatible segmentation" assumption, so ComplementMe's tolerance for inconsistency deserves testing.
- BuildingNet's message is mixed. It shows real building data are geometrically messy, which also warns against depending on mesh-level joining. Its exterior-only scope means it says nothing about interior systems.

### Gaps
- I found no paper that applies Chaudhuri-style or Kalogerakis-style models to BIM or IFC. Absence from my searches does not prove none exist.
- I found no evidence on how many IFC samples these models need. The figures above come from airplanes, chairs and similar object families, and may not carry over.

## What can inverse procedural modeling and grammar inference contribute?

### Takeaway
Grammar inference is the best conceptual fit, because it yields explicit, inspectable rules from examples. Its main obstacle for mixed IFC is that the strongest guarantees assume exact repetition, while real models from different modelers will not be exact.

### Cited Findings
- Bokeloh et al. ask for rules that produce objects locally similar to an exemplar, and derive those rules from partial symmetries. Cutting along curves in symmetric regions yields operations that maintain local similarity by construction — [Bokeloh et al. 2010](https://www.staff.uni-mainz.de/wandm/papers/ProcModFromSym-siggraph2010.pdf).
- They call the exchangeable regions "dockers" and the cuts "docking sites". They extract rewriting systems, context-free rules and grid rules, and their framework works under rigid motions, with scaling and bending left as future work — [Bokeloh et al. 2010](https://www.staff.uni-mainz.de/wandm/papers/ProcModFromSym-siggraph2010.pdf).
- Talton et al. induce a probabilistic grammar from labeled, hierarchical designs, then sample it to synthesize new artifacts, demonstrated on geometric models and Web pages — [abstract](https://experts.illinois.edu/en/publications/learning-design-patterns-with-bayesian-grammar-induction/). The Bayesian Model Merging detail comes from a search summary, not from the paper.
- Martinović and Van Gool learn 2D attributed stochastic context-free grammars from labeled facades using Bayesian Model Merging. Sampling gives new instances of the same style, and on Haussmannian buildings the learned grammar is on par with manually designed grammars for parsing — [Martinović & Van Gool 2013](https://openaccess.thecvf.com/content_cvpr_2013/papers/Martinovic_Bayesian_Grammar_Learning_2013_CVPR_paper.pdf).
- Merrell 2023 begins with polygonal example shapes, cuts edges into half-edges, and glues primitives back together. It organizes locally similar graphs into a hierarchy and derives a grammar that can construct them. An edge label records its left and right faces and tangent angle — [Merrell 2023](https://paulmerrell.org/wp-content/uploads/2024/02/ProcModelUsingGraphGram.pdf).
- Merrell lists these open problems: many gluing combinations in 3D, tight edge-length restrictions (where he says tile methods do better), and input that must contain exact self-similarity, with no handling of noisy data — [Merrell 2023](https://paulmerrell.org/wp-content/uploads/2024/02/ProcModelUsingGraphGram.pdf).
- A [technical companion](https://arxiv.org/pdf/2309.00275) examines the theory further (arXiv:2309.00275, CC BY-NC-ND 4.0).
- A search for grammars inferred from IFC found no such paper. The nearest results apply triple graph grammars to IFC-to-CityGML conversion, which is configurable conversion and not generation from examples — [Lim, Tauscher & Biljecki 2019](https://isprs-annals.copernicus.org/articles/IV-4-W8/83/2019/isprs-annals-IV-4-W8-83-2019.pdf); [Tauscher 2019](https://isprs-annals.copernicus.org/articles/IV-4-W8/115/2019/isprs-annals-IV-4-W8-115-2019.pdf). I checked only their title pages and grammar mentions.

### Inferences

| Method | Transfer to IFC | What it would require |
|---|---|---|
| Bokeloh | Find repeated subgraphs and treat their boundaries as interfaces | A tolerance-based notion of similarity; repeated IFC types may help |
| Talton, Martinović | Induce a grammar over Site, Building, Storey, Space and Element trees | Tree extraction from IFC; a separate treatment of cross-links such as connections, which a tree cannot express |
| Merrell 2023 | Replace polygon-edge labels with labels on cut IFC relations | A graph-native redefinition of cut, glue and planar embedding, plus a tolerance for noise |

- A possible IFC cut label, by analogy to Merrell's edge label, is (left class, right class, relation type, quantized geometry descriptor). This is my proposal and is untested.
- Label resolution is likely the thesis's central design variable. Coarse labels allow more recombination but less coherence. Fine labels preserve coherence but will tend to reproduce the examples, and they will rarely match across modelers.

### Gaps
- I could not read Talton's full text, so I cannot say how it handles non-tree relations or what its merge criteria are.
- I did not check Merrell's follow-on work or independent evaluations of the 2023 method beyond the search result pointing to a [Houdini implementation](https://sites.google.com/view/justinpruiz/paper-implementation).

## What do model synthesis and Wave Function Collapse offer for building or architecture applications?

### Takeaway
Model synthesis and WFC are the most practical first experiment for modular, grid-aligned buildings because their coherence rule is simple and checkable. Published AEC use I found relies mostly on authored or parametric modules. I found no case that extracts them from real IFC.

### Cited Findings
- Merrell defines consistency this way: a model M is consistent with example E if all pieces adjacent in M are also found adjacent in E along the same direction — [Merrell 2007](https://paulmerrell.org/wp-content/uploads/2021/06/model_synthesis.pdf).
- Model synthesis requires the example to break into small building blocks arranged on a 3D grid, and it searches for conflicts before adding material — [Merrell 2007](https://paulmerrell.org/wp-content/uploads/2021/06/model_synthesis.pdf).
- Its stated limitation is that examples must be decomposed into pieces by hand. Lattice-structured architectural objects suit it well, while poorly constructed examples can leave the output so constrained that it simply repeats the example — [Merrell 2007](https://paulmerrell.org/wp-content/uploads/2021/06/model_synthesis.pdf).
- WFC ensures every local window in the output occurs somewhere in the input, and operationally it is a non-backtracking, greedy search — [Karth & Smith 2017](https://escholarship.org/content/qt1f29235t/qt1f29235t.pdf).
- Karth and Smith find its heuristic and global-restart choices reasonable for image generation but not critical in general, using an answer-set-programming surrogate, and they note others are adding local backtracking — [Karth & Smith 2017](https://escholarship.org/content/qt1f29235t/qt1f29235t.pdf).
- Merrell argues model synthesis and WFC are best classed as two versions of one algorithm, and reports that WFC struggled on some large outputs that model synthesis generated in seconds — [Merrell 2021](https://paulmerrell.org/wp-content/uploads/2021/07/comparison.pdf). This is an unreviewed note by the author of one of the two methods.
- Lu et al. built a Grasshopper tool using Monoceros on an HDR primary school project, translating DfMA guidelines from spatial regulation patterns into "adjunct rules" (their term). The BIM connection was planned through Rhino.Inside Revit, and they say WFC literature suggests low fidelity and stochastic behavior limit real-world use — [Lu et al. 2024](https://papers.cumincad.org/data/works/att/caadria2024_49.pdf).
- Gao and Yu extract WFC modules automatically, but from a parametric building prototype they generate, not from real models — [Gao & Yu 2022](https://iopscience.iop.org/article/10.1088/1742-6596/2356/1/012043/pdf) (marked open access on the PDF cover page).
- Jiang and Wang deconstruct style templates into predefined spatial tiles and connection rules — [Jiang & Wang 2023](https://papers.cumincad.org/data/works/att/caadria2023_398.pdf).
- TileGPT, from Autodesk Research, has a language model produce high-level designs that WFC refines into constraint-compliant layouts — [Gaier et al. 2024](https://arxiv.org/pdf/2405.09997).

### Inferences
- The missing research step is clear: **automatic extraction of a module set and adjacency rules from real IFC**. Merrell names manual decomposition as the limitation, and the AEC cases I read avoid the issue through authored or parametric modules.
- A plausible IFC version uses cells on a detected structural or planning grid, with an adjacency table learned from observed neighbors across models. Rules that came from different modelers could then be compared directly.
- The grid is the main restriction. Real buildings with irregular or non-orthogonal geometry would need cells that vary, or a graph-based variant.
- Because WFC is a constraint solver, hard rules such as levels, structure continuity and door access could be added as constraints. Karth and Smith's solver framing is the argument for doing so. A solver that backtracks is probably preferable to plain greedy WFC when constraints are tight.

### Gaps
- I found no paper running WFC or model synthesis on modules extracted from real IFC files. A University of Tartu thesis in the search results reports WFC needs an existing grid; I did not read it.
- [Lan et al. 2023](https://doi.org/10.3390/buildings13112898) on parking layouts looks relevant, since the search summary says it extracts spatial modules. Its PDF returned 403 to my request, so it is unverified beyond metadata.

## What exists for architecture-specific recombination?

### Takeaway
Floor plans have the most mature real-data recombination, but what is reused is topology, not building elements. I found no paper that decomposes real IFC models into a kit of parts and assembles new IFC models from it. That appears to be the thesis's open space, subject to the search limits below.

### Cited Findings
- Graph2Plan retrieves floorplans and their layout graphs from a database using user constraints, lets the user adjust the graph, then generates a raster floorplan and refined room boxes for an input boundary — [Hu et al. 2020](https://arxiv.org/pdf/2004.13204).
- It uses RPLAN, with more than 80,000 human-designed samples — [Hu et al. 2020](https://arxiv.org/pdf/2004.13204).
- Its authors report that if the retrieved plan's boundary differs greatly from the input, rooms can overlap and some relationship constraints go unsatisfied. Their graphs also do not model accessibility or functional criteria — [Hu et al. 2020](https://arxiv.org/pdf/2004.13204).
- BIMSeek++ retrieves BIM components by attribute similarity, pre-processing IFC into a unified representation — [Li et al. 2020](https://yushen-liu.github.io/main/pdf/LiuYS_COMIND20_BIMSeek.pdf) (Computers in Industry 116, 103186; authors Nanxing Li, Qian Li, Yu-Shen Liu, Wenlong Lu, Wanqi Wang). I confirmed the title page and PDF, and the method summary comes from a search snippet. It retrieves components and does not assemble them.
- Merrell, Schkufza and Koltun's residential layout paper exists ([10.1145/1866158.1866203](https://doi.org/10.1145/1866158.1866203)), and I confirmed only its metadata.

### Inferences
- Graph2Plan's most transferable idea is the pipeline: **retrieve a real structure, adjust it, then realize it**. For IFC, the retrieved structure could be a space-adjacency graph, and realization could assemble real elements instead of generating pixels.
- BIMSeek++ could be a starting point for the search stage, playing the role Funkhouser's shape search plays for meshes.
- Retrieval hides a coherence cost, as Graph2Plan's failure case shows: the further a retrieved example must be adapted, the worse the result. An IFC system should report adaptation distance and treat high values as a warning.

### Gaps
- My searches for "kit of parts" with IFC and for case-based reasoning with IFC found no direct match. This was a limited web search with OpenAlex, and it did not systematically cover CumInCAD, IJAC or eCAADe. Run a dedicated CumInCAD search before stating this gap in the thesis as a confirmed finding.
- A search snippet mentioned a 2026 paper on decomposing MEP models into reusable blocks. I could not identify or verify it, so I have not cited it. It is worth finding because it could be close to this topic.

## How is coherence guaranteed when parts come from different sources?

### Takeaway
None of these methods guarantees coherence in the sense IFC needs. They offer five partial mechanisms, and a credible IFC pipeline would have to layer them, then validate the result independently. Heterogeneity between modelers is the condition these methods handle worst.

### Cited Findings

| Mechanism | How it works | Evidence | Reported failure or limit |
|---|---|---|---|
| Learned statistical compatibility | Rank or sample parts that are likely together | Network encodes labels, style clusters and adjacency, used to present semantically and stylistically compatible parts — [Chaudhuri 2011](https://www.sidch.com/docs/siggraph2011_assembly.pdf) | Compatibility is probabilistic, and a person still assembles the model |
| Explicit attachment interfaces | Parts join only through typed locations | Slots extracted from training data store the labels they can attach to, and discrete adjacency features ensure compatible slot sets — [Kalogerakis 2012](https://vladlen.info/papers/shape-synthesis.pdf) | Placement is heuristic, does not optimize orientation, and does not prevent intersections — [same](https://vladlen.info/papers/shape-synthesis.pdf) |
| Local similarity by construction | Only allow joins seen in examples | Adjacency consistency — [Merrell 2007](https://paulmerrell.org/wp-content/uploads/2021/06/model_synthesis.pdf); docking sites — [Bokeloh 2010](https://www.staff.uni-mainz.de/wandm/papers/ProcModFromSym-siggraph2010.pdf); half-edge gluing — [Merrell 2023](https://paulmerrell.org/wp-content/uploads/2024/02/ProcModelUsingGraphGram.pdf) | Needs exact self-similarity, and no noisy input — [Merrell 2023](https://paulmerrell.org/wp-content/uploads/2024/02/ProcModelUsingGraphGram.pdf) |
| Synthesized or repaired joints | Fix the seam after selecting parts | COALESCE erodes mismatched regions and synthesizes the joint, for parts from different objects — [Yin 2020](https://arxiv.org/pdf/2008.01936); manual stitching — [Funkhouser 2004](https://www.cs.princeton.edu/~funk/sig04a.pdf) | Fails when incompatibility is too large or beyond what was learned — [Yin 2020](https://arxiv.org/pdf/2008.01936) |
| Structural or graph-level constraints | Penalize or solve for relation violations | Adjacency and symmetry losses — [Mo 2019](https://arxiv.org/pdf/1908.00575); constraint solving — [Karth 2017](https://escholarship.org/content/qt1f29235t/qt1f29235t.pdf); layout graphs — [Hu 2020](https://arxiv.org/pdf/2004.13204) | Soft losses can break relations (Mo notes small errors become apparent there), and some graph constraints go unmet — [Hu 2020](https://arxiv.org/pdf/2004.13204) |

- Style in these papers is geometric: Chaudhuri clusters components by geometric style — [Chaudhuri 2011](https://www.sidch.com/docs/siggraph2011_assembly.pdf). Liu et al.'s [Style Compatibility for 3D Furniture Models](https://doi.org/10.1145/2766898) (Tianqiang Liu, Aaron Hertzmann, Wilmot Li, Thomas Funkhouser, 2015) is a dedicated follow-up, confirmed by metadata only.
- IFC supports explicit interfaces in some cases. [IfcRelConnectsPorts](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcRelConnectsPorts.htm) defines how two ports connect, and [IfcRelFillsElement](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcRelFillsElement.htm) with IfcRelVoidsElement expresses wall, opening and door dependence. Both come from search snippets of buildingSMART pages, which returned 403 to direct fetches.
- IfcRelConnectsPathElements carries connection type properties at each end, according to a [third-party class reference](https://reference.aspose.com/cad/java/com.aspose.cad.fileformats.ifc.ifc4.entities/IfcRelConnectsPathElements), not the official definition.
- Tooling does not solve this. IfcPatch's MergeProjects combines IfcProject elements and converts length units, but does no further processing, so duplicate spatial hierarchies can remain — [IfcOpenShell docs](https://docs.ifcopenshell.org/autoapi/ifcpatch/recipes/MergeProjects/index.html).

### Inferences

The sections below are my proposal, built on the findings above. None of it has been tested.

**Why mixing modelers is the hard case.** The same physical joint may be represented differently across files, for example in how a wall meets a slab, or in whether a connection relation exists at all. Example-based local similarity would treat those as different and never join them. Methods that need exact repetition may therefore see little recombination *across* sources, even if they work well within one source. This should be measured early, because it could decide which method family is viable.

**A layered coherence strategy for IFC:**

1. **Normalize before learning.** Harmonize units, axes, levels, grids and class usage so equivalent interfaces can match. Without this, the interface labels will not align across files.
2. **Define interface signatures on each cut relation.** Include class pair, relation type, and quantized geometry and material descriptors. Use native IFC relations where they exist, and infer them from geometry where they do not.
3. **Select with a learned model.** Use Chaudhuri or Kalogerakis-style compatibility, including a "source" or "style" variable, so the system can learn which mixes are rare.
4. **Assemble under hard constraints.** Use a solver or grammar for what must hold, such as levels, grid and hosting of openings.
5. **Repair semantically, not as meshes.** COALESCE's idea transfers as a learned connector, predicting relations, trims or extensions, and not as a generated surface that would lose IFC semantics.
6. **Validate independently.** Check schema validity, relation integrity, clashes and rule sets on every output, and report rates. No surveyed method can substitute for this.

**A suggested first experiment.** Take one typology with a shared grid and two or more independent modelers. Extract adjacency tables and run within-source and cross-source synthesis. Report the share of joins that are possible across sources, the validity rate, and how often outputs simply copy the examples (the risk Merrell warns about). Vary label resolution to chart the coverage-versus-coherence trade-off.

**A suggested architecture** by level:

| Level | Candidate method |
|---|---|
| Space topology | Graph2Plan-style retrieve and adjust |
| Repetitive modular zones | Model synthesis or WFC, as a constraint problem |
| Non-grid structure | Merrell 2023-style graph grammar, extended for tolerance |
| Part selection and style | Chaudhuri or Kalogerakis |
| Joints | Slots first, then a learned connector where needed |

### Gaps
- No surveyed paper measures coherence across parts from *different authors'* conventions. Their "different sources" means different objects in curated repositories, which is a milder problem.
- No paper here evaluates functional, code-related or structural validity of assembled results. Graph2Plan explicitly excludes accessibility and function, and Kalogerakis names function analysis as future work.
- I did not verify how often real IFC files populate connection relations. This is decisive for step 2 and should come from the data-availability and IFC-graph researchers.
- IFC schema claims need checking against the official buildingSMART pages, because direct access was blocked here.
- The style-compatibility literature was not reviewed beyond Chaudhuri, and architectural style across modelers may differ from furniture-style geometry.
