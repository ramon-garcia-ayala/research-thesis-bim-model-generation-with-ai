# How real IFC / BIM models are decomposed into machine-learnable representations

Notes checked on 2026-11-08. Scope is the decomposition half only.

**Verification tags used on every record**

- **[FT]** Claim read in the paper's extracted full text. I read the abstract plus passages located by targeted keyword search, not every page cover to cover. Any "no write-back" statement means my keyword search of the full text (write, export, round-trip, back to IFC, reconstruct) found nothing, which is weaker than the paper saying so.
- **[META]** Bibliographic fields or licence from the OpenAlex record, figshare record or arXiv abstract page.
- **[SNIPPET]** Search-engine summary, repository README or another paper's description. The primary paper was not read.
- **PDF check** means my client received HTTP 200 and a file starting with `%PDF-` on 2026-11-08.
- MDPI, Hindawi/Wiley, ScienceDirect and OUP returned HTTP 403 to my client on every publisher PDF URL I tried. Those URLs may work in a normal browser, but I did not verify that. Where I got the PDF from the Internet Archive instead, the record says so.

## Which papers convert IFC to graphs, and what is preserved?

### Takeaway
IFC-Graph (Zhu et al. 2023) is the only reviewed labelled-property-graph route that converts every instance, and it checks completeness, but it is not shown going back to a file. Every ML-oriented graph drops most of the schema, and the common compromise is to keep semantics and topology in the graph and push geometry into embeddings, bounding boxes or external files.

### Cited Findings

**Paper records**

**1. IFC-graph for facilitating building information access and query**
- Authors: Junxiang Zhu, Peng Wu, Xiang Lei. Year 2023. Automation in Construction 148, 104778. DOI 10.1016/j.autcon.2023.104778.
- PDF checked: https://api.figshare.com/v2/file/download/62792194 (Curtin repository copy; redirects to signed storage). Licence CC BY 4.0 [META].
- Relevance: **high**. It is the most complete lossless-intent IFC graph and the natural baseline for any decomposition that must preserve everything.
- Mapping: entities become nodes, intrinsic attributes become node properties, extrinsic attributes become edges; this description is from the follow-up paper by the same group [FT] — [Zhu et al. 2024 arXiv](https://arxiv.org/pdf/2405.16345)
- Conversion uses IfcOpenShell and traverses all instances and attributes "to guarantee a complete conversion" [FT] — [Zhu et al. 2023](https://api.figshare.com/v2/file/download/62792194)
- Completeness check: nodes with numeric id equal instances in the IFC-SPF, number of labels equals number of entities, relationship names equal attribute names [FT] — [Zhu et al. 2023](https://api.figshare.com/v2/file/download/62792194)
- Class hierarchy is preserved as multiple labels per node, and resource entities without an id get text identifiers [FT] — [Zhu et al. 2023](https://api.figshare.com/v2/file/download/62792194)
- The authors list "properly handling geometric information in graph" as an open limitation and note geometry might be excluded from graphs entirely [FT] — [Zhu et al. 2023](https://api.figshare.com/v2/file/download/62792194)
- They criticise earlier Neo4j work (Ismail and Nahar) as incomplete: IFC-SPF uploaded to IfcWebServer, entities chosen manually in scripts, exported as CSV, and only selected instances converted [FT] — [Zhu et al. 2023](https://api.figshare.com/v2/file/download/62792194)
- Validated on 8 models from KIT, the Open IFC Model Repository and projects. Names seen include Institute, Smiley, House, Bridge 1, Bridge 2 and Hospital, but the table was garbled in extraction, so I do not give per-model values [FT].
- No reverse IFC-Graph to IFC-SPF conversion found (keyword search) [FT].

**2. Releasing the power of graph for building information discovery** (arXiv title: Cypher4BIM: Releasing the Power of Graph for Building Knowledge Discovery)
- Authors: Junxiang Zhu, Nicholas Nisbet, Mengtian Yin, Ran Wei, Ioannis Brilakis. Year 2025. Automation in Construction, DOI 10.1016/j.autcon.2025.106034; arXiv 2405.16345.
- PDF checked: https://arxiv.org/pdf/2405.16345. Licence: arXiv non-exclusive for the preprint; journal version listed CC BY [META].
- Relevance: **medium**. It shows spatial structure, space boundary and accessibility can be queried from IFC-Graph, which is what a subgraph extractor needs, but it does not extract a dataset.
- Five models validated (Duplex, House, Smiley, Institute, Clinic). Example: Institute 10.9 MB, 147,712 instances, 194,845 nodes, 285,504 edges [FT] — [Zhu et al. 2024 arXiv](https://arxiv.org/pdf/2405.16345)

**3. Semantics-based connectivity graph for indoor pathfinding powered by IFC-Graph**
- Authors: Junxiang Zhu, Mun On Wong, Nicholas Nisbet, Jinying Xu, Tom Kelly, Sisi Zlatanova, Ioannis Brilakis. Year 2025. Automation in Construction, DOI 10.1016/j.autcon.2025.106019.
- PDF checked: https://www.repository.cam.ac.uk/bitstreams/17c2bdd2-2839-4c7f-ad9e-d93b1b1e0fc4/download. Licence CC BY [META].
- Relevance: **medium**. It derives a space connectivity graph from IFC semantics alone, without geometric processing.
- Used Institute, Dorm and a modified Dorm. Dorm: 40.1 MB, 657,433 instances, 675,431 nodes, 1,377,409 edges [FT] — [Zhu et al. 2025](https://www.repository.cam.ac.uk/bitstreams/17c2bdd2-2839-4c7f-ad9e-d93b1b1e0fc4/download)

**4. Graph Representation Learning: Embedding Multimodality BIM Models into Graphs**
- Authors: Zijian Wang, Huaquan Ying. Year 2025. EC3 / CIB W78 2025, DOI 10.35490/ec3.2025.286.
- PDF checked: https://ec-3.org/wp-content/uploads/2025/10/EC32025_286.pdf. Licence not stated in the PDF text [FT].
- Relevance: **high**. It is a working IFC-to-ML pipeline on real models that keeps attributes, topology and geometry as separate embeddings.
- Graph compiler in Python and IfcOpenShell extracts objects under IfcObject with all available properties including user-defined property sets; relationships come from the IFC schema plus geometric enrichment (contact, intersect) [FT] — [Wang and Ying 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_286.pdf)
- Attributes become text embeddings and geometry becomes point-cloud embeddings; 15 IFC object classes, 21,083 nodes, 137,381 edges [FT] — [Wang and Ying 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_286.pdf)
- Labels were corrected by hand: 566 objects relabelled in one model because types were wrong in the source [FT] — [Wang and Ying 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_286.pdf)
- Embeddings are one-way. No write-back found (keyword search) [FT].

**5. Building Information Graphs (BIGs): remodeling building information for learning and applications**
- Authors: Zijian Wang, Rafael Sacks. Year 2025. Data-Centric Engineering 6, e44. DOI 10.1017/dce.2025.10024. Position paper.
- PDF checked: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/ED0C0B75DA5D10EA87B206FCAF5FAA0C/S2632673625100245a.pdf/div-class-title-building-information-graphs-bigs-remodeling-building-information-for-learning-and-applications-div.pdf. Licence: Creative Commons Attribution [FT].
- Relevance: **medium**. It is a design argument for discipline subgraphs and a meta-graph, not an evaluated decomposition.
- Discipline models become subgraphs joined by a meta-graph; geometry stays in native files such as PLY, with the file address stored as a node attribute [FT] — [Wang and Sacks 2025](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/ED0C0B75DA5D10EA87B206FCAF5FAA0C/S2632673625100245a.pdf/div-class-title-building-information-graphs-bigs-remodeling-building-information-for-learning-and-applications-div.pdf)
- States that IFCtoLBD omits many object attributes and all geometries, "resulting in incomplete model information" [FT] — [Wang and Sacks 2025](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/ED0C0B75DA5D10EA87B206FCAF5FAA0C/S2632673625100245a.pdf/div-class-title-building-information-graphs-bigs-remodeling-building-information-for-learning-and-applications-div.pdf)

**6. The IFC to Linked Building Data Converter - Current Status**
- Authors: Mathias Bonduel, Jyrki Oraskari, Pieter Pauwels, Maarten Vergauwen, Ralf Klein. Year 2018. LDAC 2018 (CEUR-WS Vol-2159). No DOI found.
- PDF checked: http://ceur-ws.org/Vol-2159/04paper.pdf. Licence: CC BY on the Ghent copy per OpenAlex [META].
- Relevance: **low**. It deliberately discards geometry, so it cannot support regeneration on its own.
- All geometry-related triples from the ifcOWL RDF are excluded, and properties are offered at three levels (PROPS L1 to L3). Tested on the Duplex model, 2.3 MB IFC2x3, 227,143 ifcOWL triples [FT] — [Bonduel et al. 2018](http://ceur-ws.org/Vol-2159/04paper.pdf)

**7. BOT: The building topology ontology of the W3C linked building data group**
- Authors: Mads Holten Rasmussen, Maxime Lefrançois, Georg Ferdinand Schneider, Pieter Pauwels. Year 2020 (OpenAlex; PDF filename indicates Semantic Web vol. 12, 2021). DOI 10.3233/sw-200385.
- PDF checked: https://pure.tue.nl/ws/files/182722620/sw_2021_12_1_sw_12_1_sw200385_sw_12_sw200385.pdf. Licence CC BY [META].
- Relevance: **low**. It is a target vocabulary, and I did not read it for evidence on real models.
- Defines bot:Site, bot:Building, bot:Storey, bot:Space, bot:Element and relations such as bot:containsElement; this list is as described in Bonduel et al. [FT] — [Bonduel et al. 2018](http://ceur-ws.org/Vol-2159/04paper.pdf)

**8. Implementation and Experiments with an IFC-to-Linked Data Converter**
- Authors: Nam Vu Hoang, Seppo Törmä. Year 2015. CIB W78 2015. No DOI found.
- PDF checked: https://itc.scix.net/pdfs/w78-2015-paper-029.pdf. Licence not stated in my extraction.
- Relevance: **medium**. It states the lossless ifcRDF claim explicitly, which sets the theoretical upper bound for RDF routes.
- "By default, the IFC-SPFF-to-RDF converter produces ifcRDF datasets without information loss" [FT] — [Hoang and Törmä 2015](https://itc.scix.net/pdfs/w78-2015-paper-029.pdf)

**9. IfcLLM: Natural Language Querying of IFC Models through Complementary Relational and Graph Representations**
- Authors: Rabindra Lamsal, Sisi Zlatanova, Haowen Xu, Yafei Sun, Johnson Xuesong Shen. Year 2026. arXiv 2605.13236.
- PDF checked: https://arxiv.org/pdf/2605.13236. Licence CC BY-NC-ND 4.0 [META].
- Relevance: **low**. It is a query system, useful only as an example of a hybrid store.
- Selected elements, properties and geometry go to SQLite while a graph layer holds spatial relationships built from precomputed geometric primitives. Evaluated on 3 open models, with 10 models for timing [FT] — [Lamsal et al. 2026](https://arxiv.org/pdf/2605.13236)

**10. Topology-Driven Semantic Integration of Independent BIM Models for Renovation Analysis**
- Authors: Jacopo Cassandro, Claudio Mirarchi. Year 2026. EC3 2026. DOI not captured, and I will not guess one.
- PDF checked: https://ec-3.org/wp-content/uploads/2026/08/EC32026_346.pdf. Licence not checked.
- Relevance: **medium**. It shows how to compute element adjacency that IFC does not store.
- Starts from independent IFC files, infers physical contacts by coplanarity, opposite orientation, vertical overlap and an overlap-coverage metric, and writes them as cross-model relations using bot:Interface [FT, abstract only] — [Cassandro and Mirarchi 2026](https://ec-3.org/wp-content/uploads/2026/08/EC32026_346.pdf)

**11. Reasoning about accessibility for disabled using building graph models based on BIM/IFC**
- Authors: Barbara Strug, Grażyna Ślusarczyk. Year 2017. Visualization in Engineering 5:10. DOI 10.1186/s40327-017-0048-z.
- PDF checked: https://viejournal.springeropen.com/track/pdf/10.1186/s40327-017-0048-z. "Open Access" per PDF header; licence line not extracted.
- Relevance: **low**. It is an early task-specific graph.
- Graph attributes encode space types and sizes on nodes and movement costs on edges, extracted from the IFC file [FT] — [Strug and Ślusarczyk 2017](https://viejournal.springeropen.com/track/pdf/10.1186/s40327-017-0048-z)

**12. Optimizing IFC-structured Data Graph for Code Compliance Checking**
- Authors: Yohann Schatz, Bernd Domer. Year 2022. EG-ICE 2022. DOI 10.7146/aul.455.c208.
- PDF checked: https://ebooks.au.dk/aul/catalog/download/455/312/1856?inline=1. Licence not stated in my extraction.
- Relevance: **low**. It is relevant only as evidence that raw ifcOWL graphs vary by authoring tool.
- The RDF graph follows the IFC structure and is sensitive to input variation; a "standardized" structure simplifies rules and reduces graph size [FT, abstract] — [Schatz and Domer 2022](https://ebooks.au.dk/aul/catalog/download/455/312/1856?inline=1)

**What each graph route keeps**

| Route | Geometry | Topology / relations | Semantics / Psets | Evidence |
|---|---|---|---|---|
| IFC-Graph (LPG, full) | Kept as instance nodes; authors call handling unresolved | All IFC relations | All attributes | [FT] |
| ifcRDF / ifcOWL | Lossless claimed; ordered lists make it verbose | All | All | [FT] Hoang and Törmä; verbosity [SNIPPET] |
| IFCtoLBD / BOT | Dropped | Simplified, spatial | Three property levels | [FT] |
| Wang and Ying compiler | Separate point-cloud embedding | IFC relations plus computed contact and intersect | All, including user Psets, as text embeddings | [FT] |
| Hornung schema | Oriented bounding box only | Containment plus bounding-box overlap | Type one-hot; Psets not retained (retention listed as future work) | [FT] |
| Collins mesh graph | Mesh only | None between objects | None | [FT] |

### Inferences
- Lossless and learnable pull apart. Full graphs are larger than the source (Dorm 40.1 MB gives over 1.3 million edges), so ML papers reduce to a few classes and summary geometry. A thesis probably needs two layers: a lossless graph as the source of truth, and a reduced learning view with stable links back to it.
- GlobalId or instance id carried into the learning view is the cheap way to keep that link. This is my reasoning, supported indirectly by Gui et al. (see the reversibility section).

### Gaps
- I could not read: Gradišar and Dolenc 2021 ([DOI](https://doi.org/10.1155/2021/4913394), HTTP 403 and Wayback 429; search summary only), Mediavilla et al. 2023 ([DOI](https://doi.org/10.1016/j.enbuild.2023.112795), listed repository URL returned 404).
- Khalili and Chua (IFC-Based Graph Data Model for Topological Queries on Building Elements, [DOI](https://doi.org/10.1061/(asce)cp.1943-5487.0000331)) is closed per OpenAlex, with no legal open PDF found. Metadata only.
- Ismail et al. on Neo4j: I did not locate the primary papers in OpenAlex, so they are not recommended. I only have Zhu's description of them.

## Which papers extract subgraphs, spatial units, element datasets or modules from real models?

### Takeaway
Three levels recur: isolated elements (IFCNet, IFCNet++, BIMCompNet), whole-model element or space graphs (Austern, Buruzs, Han), and local subgraphs (Hornung et al. 2025, the closest match to this thesis). The well-known room-classification work by Wang, Sacks and Yeung should not be cited as IFC decomposition, because its conference version built graphs by hand from floor-plan images.

### Cited Findings

**Paper records**

**13. Augmenting IFC-Based BIM Models for Graph Neural Network Training of Non-Orthogonal Spatial Typologies: A Context-Informed Design Methodology**
- Authors: Matthias Hornung, Markus Renner, Diellza Elshani, Mathias Niepert, Thomas Wortmann. Year 2025. CAAD Futures 2025, Vol. II, pp. 869-883. DOI 10.25442/hku.29365832.
- PDF checked: https://api.figshare.com/v2/file/download/55632518 (redirects to signed storage; the ndownloader link gave 403). Licence CC BY-NC 4.0 [META, FT].
- Relevance: **high**. It is the only reviewed paper that goes from real IFC files through subgraphs to a graph-generative task, although it stops before IFC output.
- Data: 148 firms contacted, 24 responded substantively, 50 IFC files received, 22 usable; 28 excluded for missing classes, corruption or IfcOpenShell parsing failures. Rotation and mirroring expanded this to about 109 buildings [FT] — [Hornung et al. 2025](https://api.figshare.com/v2/file/download/55632518)
- Kept: six classes only (IfcBuildingStorey, IfcSpace, IfcSlab, IfcWall, IfcColumn, IfcBeam) as a directed NetworkX graph, with edges from bounding-box overlap and IFC containment or aggregation, inspired by BOT [FT] — [Hornung et al. 2025](https://api.figshare.com/v2/file/download/55632518)
- Lost: real shape. Node features are the minimal oriented bounding box centre, width, length, height and normalised axis vectors, plus type one-hot; openings are simplified away [FT] — [Hornung et al. 2025](https://api.figshare.com/v2/file/download/55632518)
- Decomposition: a constrained traversal from each node gives 20-node subgraphs, over 600,000 in total; subgraphs are then deconstructed node by node for a simplified DGMG, and balancing gives IFC_180k (180,000 samples, at most 30,000 per node type) and IFC_18k [FT] — [Hornung et al. 2025](https://api.figshare.com/v2/file/download/55632518)
- Authors name selective retention of property sets, material properties and spatial programs as future work [FT]. No write-back found: "writ*", ".ifc" and "back into" had no matches in the extracted text [FT].

**14. IFCNet: A Benchmark Dataset for IFC Entity Classification**
- Authors: Christoph Emunds, Nicolas Pauen, Veronika Richter, Jérôme Frisch, Christoph van Treeck. Year 2021. EG-ICE 2021; arXiv 2106.09712; RWTH DOI 10.18154/rwth-2021-09472 per OpenAlex.
- PDF checked: https://arxiv.org/pdf/2106.09712. Licence arXiv non-exclusive [META].
- Relevance: **high**. It is the largest real-model element decomposition I read, and each part stays an IFC file.
- About 1,000 IFC models from real-world projects, student works and online sources, including the Auckland open repository; decomposed "by extracting all objects into separate files", with attached IfcPropertySets extracted too [FT] — [Emunds et al. 2021](https://arxiv.org/pdf/2106.09712)
- About 1.2M entities in 82 classes before deduplication by geometry; 19,613 confirmed objects in 65 classes; IFCNetCore is 7,930 objects in 20 classes [FT] — [Emunds et al. 2021](https://arxiv.org/pdf/2106.09712)
- Representation types kept include Brep, AdvancedBrep, MappedRepresentation, SweptSolid, Tessellation and CSG [FT]. Experiments use geometry only [FT, abstract].
- Lost: inter-element relations, which IFCNet++ states as the gap it addresses [FT] — [Luo et al. 2022](https://arxiv.org/pdf/2212.00942)

**15. A Geometric-Relational Deep Learning Framework for BIM Object Classification** (introduces IFCNet++)
- Authors: Hairong Luo, Ge Gao, Han Huang, Ziyi Ke, Cheng Peng, Ming Gu. Year 2022 preprint, 2023 LNCS (CVCIE @ ECCV 2022). DOI 10.1007/978-3-031-25082-8_23; arXiv 2212.00942. Author names are from the arXiv PDF; OpenAlex wrongly shows the third author as "Han Pang Huang".
- PDF checked: https://arxiv.org/pdf/2212.00942. Licence arXiv non-exclusive [META].
- Relevance: **medium**. It shows the minimum relational addition, but counts discard which element is related to which.
- "More than ten IFC files" split into objects, exported to OBJ, deduplicated; at most 2,000 objects per type [FT] — [Luo et al. 2022](https://arxiv.org/pdf/2212.00942)
- Relations are reduced to count vectors for four types (IfcRelConnectsElement, IfcRelFillsElement, IfcRelAggregates, IfcRelVoidsElement), chosen because most files contain them. The authors say few relationships are implemented in most IFC files and some get lost [FT] — [Luo et al. 2022](https://arxiv.org/pdf/2212.00942)

**16. BIMCompNet: Multimodal Dataset for Geometric Deep Learning in Building Information Model**
- Authors: Mingsong Yang, Xinhong Hei, Kehai Chen, Haining Meng, HaoYang Dong, Qin Zhao [META]. Year 2025. ACM Multimedia 2025. DOI 10.1145/3746027.3758238.
- **No open-access PDF found**: OpenAlex lists it as closed, with no repository copy. Code MIT; a separate dataset licence is not stated in the README [SNIPPET].
- Relevance: **high, provisional**. Per-component IFC plus a semantic graph is close to a reusable part format, but I have not read the paper.
- 87 IFC classes in the full set; each instance has an IFC-SPF file, multi-view images, point cloud, mesh, voxels and an IFC-derived semantic graph as CSV [SNIPPET] — [Hugging Face card](https://huggingface.co/datasets/YaMiSo1995/BIMCompNet_100-samplesubset/blob/main/README.md)
- Source of the IFC data and number of projects are not stated on either page [SNIPPET] — [GitHub README](https://github.com/Yang-Mingsong/BIMCompNet)

**17. Incorporating Context into BIM-Derived Data—Leveraging Graph Neural Networks for Building Element Classification**
- Authors: Guy Austern, Tanya Bloch, Yael Abulafia. Year 2024. Buildings 14(2), 527. DOI 10.3390/buildings14020527.
- PDF checked via archive: https://web.archive.org/web/2024id_/https://www.mdpi.com/2075-5309/14/2/527/pdf (publisher URL https://www.mdpi.com/2075-5309/14/2/527/pdf returned 403 to my client). Licence CC BY [META].
- Relevance: **medium**. It gives the strongest methodological warning for any dataset split.
- Over 42,000 elements from eleven BIM files from local architecture offices (residential and commercial), stored as JSON with basic geometry; edges are immediate neighbours [FT] — [Austern et al. 2024](https://web.archive.org/web/2024id_/https://www.mdpi.com/2075-5309/14/2/527/pdf)
- Accuracy fell from about 98% on validation to 81-90% on unseen files, and the authors argue evaluation must hold out whole files [FT] — [Austern et al. 2024](https://web.archive.org/web/2024id_/https://www.mdpi.com/2075-5309/14/2/527/pdf)
- The passages I read describe "a parametric methodology" and "BIM files"; I could not confirm whether extraction parses IFC or runs in the authoring tool.

**18. IFC BIM Model Enrichment with Space Function Information Using Graph Neural Networks**
- Authors: Adam Buruzs, Miloš Šipetić, Brigitte Blank-Landeshammer, Gerhard Zucker. Year 2022. Energies 15(8), 2937. DOI 10.3390/en15082937.
- PDF checked via archive: https://web.archive.org/web/2024id_/https://www.mdpi.com/1996-1073/15/8/2937/pdf (publisher URL returned 403 to my client). Licence CC BY [META].
- Relevance: **high**. It works on public real IFC and is one of the few papers that writes derived entities back into the IFC file.
- Detects IfcSpace geometrically, then computes an accessibility graph "not explicitly stored in IFC models"; node features come from geometry and neighbouring elements [FT] — [Buruzs et al. 2022](https://web.archive.org/web/2024id_/https://www.mdpi.com/1996-1073/15/8/2937/pdf)
- Limits: vertical walls and horizontal slabs assumed; spaces are extruded with storey height taken as the median wall height [FT] — [Buruzs et al. 2022](https://web.archive.org/web/2024id_/https://www.mdpi.com/1996-1073/15/8/2937/pdf)
- Data: eight IFC models of residential buildings from the Ghent University and DURAARK repositories, 13 room types, 320 spaces [FT] — [Buruzs et al. 2022](https://web.archive.org/web/2024id_/https://www.mdpi.com/1996-1073/15/8/2937/pdf); contradicted by Ziaee and Suter, who report 15 online IFC models, 8 functions and 1,500 spaces for the same paper [FT] — [Ziaee and Suter 2023](https://arxiv.org/pdf/2307.04515). The paper may describe more than one dataset; I did not resolve this.

**19. Assessing IFC classes with means of geometric deep learning on different graph encodings**
- Authors: Fiona C. Collins, Alexander Braun, Martin Ringsquandl, Daniel M. Hall, André Borrmann. Year 2021. EC3 2021. DOI 10.35490/ec3.2021.168.
- PDF checked: https://ec-3.org/wp-content/uploads/2025/10/EC32021_168.pdf. Licence not stated in the PDF text [FT].
- Relevance: **medium**. It is element-level geometry-only work, useful for how to encode shape as a graph.
- 22 IFC files from Revit and ArchiCAD by different practitioners; each tessellated object becomes a mesh graph or a 5-NN graph. The native mesh lacks nodes on large faces, while k-NN loses detail on complex parts [FT] — [Collins et al. 2021](https://ec-3.org/wp-content/uploads/2025/10/EC32021_168.pdf)
- Classification is "based solely on the 3D shape", so properties and inter-element relations are excluded [FT, abstract].

**20. SAGC-A68: a space access graph dataset for the classification of spaces and space elements in apartment buildings**
- Authors: Amir Ziaee, Georg Suter. Year 2023. EG-ICE 2023; arXiv 2307.04515.
- PDF checked: https://arxiv.org/pdf/2307.04515. Licence CC BY 4.0 [META]. Dataset: https://doi.org/10.5281/zenodo.7805872; code: https://github.com/A2Amir/SAGC-A68 [FT].
- Relevance: **medium**. It is an open and well-documented spatial dataset, but the passages I read do not describe an IFC pipeline.
- 68 digital 3D models, 275 apartments, built or designed 1952-2019; 78% from Austria, Germany and Switzerland; 22 space function and 6 space element classes (2,426 and 2,445 instances per its table) [FT] — [Ziaee and Suter 2023](https://arxiv.org/pdf/2307.04515)
- Graphs keep access topology with edge length as a feature; adjacency relations are left to future work [FT] — [Ziaee and Suter 2023](https://arxiv.org/pdf/2307.04515)

**21. Room Type Classification for Semantic Enrichment of Building Information Modeling Using Graph Neural Networks** (conference precursor)
- Authors: Zijian Wang, Timson Yeung, and others; the running head reads "Z. Wang, T. Yeung et al." and I did not extract the full list, so confirm before citing. Year 2021. CIB W78 2021.
- PDF checked: https://cumincades.scix.net/pdfs/w78-2021-paper-077.pdf. Licence not stated in my extraction.
- Relevance: **low** for decomposition of real IFC, since no IFC is parsed.
- 224 apartment layouts; the authors state there was no apartment model repository and no suitable parser, so research assistants built graphs manually from layout images [FT] — [Wang et al. 2021](https://cumincades.scix.net/pdfs/w78-2021-paper-077.pdf)

**22. Exploring graph neural networks for semantic enrichment: Room type classification**
- Authors: Zijian Wang, Rafael Sacks, Timson Yeung. Automation in Construction 134, 104039 (2022 issue; OpenAlex year 2021). DOI 10.1016/j.autcon.2021.104039.
- **No open-access PDF found** (OpenAlex closed). Not read.
- Relevance: **low**, for the same reason as above if the journal version uses the same data. A third party describes it as manually created from online images, 224 apartments, 2,076 spaces [FT in Ziaee and Suter] — [Ziaee and Suter 2023](https://arxiv.org/pdf/2307.04515)

**23. Pretrained graph neural network for embedding semantic, spatial, and topological data in building information models** (arXiv title begins "BIGNet")
- Authors: Jin Han, Xinzheng Lu, Jia-Rui Lin. Year 2025. Computer-Aided Civil and Infrastructure Engineering. DOI 10.1111/mice.70073; arXiv 2509.11104.
- PDF checked: https://arxiv.org/pdf/2509.11104. Licence CC BY-NC-ND 4.0 on arXiv; CC BY-NC on Wiley [META].
- Relevance: **medium**. It is the largest graph corpus I read, but it comes from the Revit API, not IFC.
- 176 graphs, 974,991 nodes, 3,414,280 edges from hospital, residential and industrial models; 16 real-world models annotated with errors for transfer tasks [FT] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104)
- Components are semantic nodes and relationships are promoted to spatial and topological nodes; 158-dimensional features with zeros for missing values; implemented with Python 3.9 and the Revit API [FT] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104)

**24. Multi-granularity infrastructure-BIM object classification and decomposition for highway project delivery**
- Authors: Mengtian Yin, Junxiang Zhu, Xingbo Gong, Fengqiao Zhang, Yixiong Jing, Ioannis Brilakis. Year 2026. ISARC 2026. DOI 10.22260/isarc2026/0176.
- PDF checked: https://www.iaarc.org/./publications/fulltext/ISARC2026_1332.pdf. Licence not checked.
- Relevance: **low**. It is the only paper here that decomposes inside an element, but in highways and on mostly synthetic data.
- Per-face mesh classification splits coarse objects into parts; 6,058 IFC elements with 5,376 coarse, and a synthetic to original ratio of 51:1 [FT] — [Yin et al. 2026](https://www.iaarc.org/./publications/fulltext/ISARC2026_1332.pdf)

**Closed or unread, not recommended without access**
- Gan, BIM-based graph data model for automatic generative design of modular buildings, Automation in Construction, DOI [10.1016/j.autcon.2021.104062](https://doi.org/10.1016/j.autcon.2021.104062). **No open-access PDF found.** Han et al. describe it as room nodes with adjacency and connectivity edges for generative design [FT in Han et al.] — [Han et al. 2025](https://arxiv.org/pdf/2509.11104). Potentially **high** relevance as the nearest module-level precedent, so worth getting through a library.
- Emunds et al., SpaRSE-BIM, Advanced Engineering Informatics, DOI [10.1016/j.aei.2022.101641](https://doi.org/10.1016/j.aei.2022.101641). **No open-access PDF found.** Metadata only.

**"BIMGNN"**: I found no IFC decomposition paper by this name. A search summary points to a "BIM-GNN" at ISARC 2023 (Kayhani, McCabe, Sankaran) that assesses construction quality, not IFC decomposition [SNIPPET] — [ISARC 2023](https://www.iaarc.org/publications/fulltext/002_ISARC%202023_Paper_169.pdf). I did not read it and do not recommend it for this topic.

### Inferences
- Decomposition granularity and reversibility trade against each other in the literature. Element files stay IFC but lose context; subgraphs keep context but lose IFC.
- A 20-node traversal subgraph from Hornung et al. is not an architectural unit. It is a sampling device, so a thesis aiming at reusable parts would need meaningful boundaries such as storey, apartment or core. I found no paper that defines and validates such modules from real IFC.
- Hold out whole models when splitting data: Austern's result implies that random element splits overstate performance, and Hornung's rotation and subgraph overlap make leakage a real risk.

### Gaps
- I did not find an IFC-native extraction of apartments, cores or similar functional modules as reusable units, within the limits of my searches.
- The size of the BIMCompNet full dataset and the origin of its IFC data could not be verified.
- IFCNet's per-file validity (whether each single-entity file passes a schema validator) is not reported in the passages I read.

## Is the decomposition reversible, meaning can parts be written back to valid IFC?

### Takeaway
I found no paper that demonstrates the full loop from real IFC through a learned representation to a new valid IFC. What exists are partial reversals: rule-based partial models, graph-based merging, normalised rewriting, graph-to-IFC enrichment that reuses the original geometry, and one graph-to-Revit rebuild.

### Cited Findings

**Paper records**

**25. An ontology-driven bi-directional workflow for integrating project management data into the IFC standard**
- Authors: Venkatesh Kone, Gangadhar Mahesh. Year 2025. ITcon 30, pp. 1768-1795. DOI 10.36680/j.itcon.2025.073.
- PDF checked: https://www.itcon.org/papers/2025_73-ITcon-Kone.pdf. Licence CC BY 4.0 [FT].
- Relevance: **high** for the write-back mechanism, not for geometry generation.
- Claims a full round trip, IFC to knowledge graph to IFC', and calls the reverse transformation "significantly less explored" [FT] — [Kone and Mahesh 2025](https://www.itcon.org/papers/2025_73-ITcon-Kone.pdf)
- The new file "contains the original geometry plus new, native IFC entities" for tasks, resources and costs, so geometry is not rebuilt from the graph [FT] — [Kone and Mahesh 2025](https://www.itcon.org/papers/2025_73-ITcon-Kone.pdf)
- Validity is checked against the IFC schema with IfcOpenShell. Limits: one case study (Duplex House, IFC4), domain limited to schedule, resources and cost, no benchmark, manual element-to-task linking. Materials: https://github.com/konevenkatesh/data-centric-bim.git [FT].

**26. Generic Language for Partial Model Extraction from an IFC Model Based on Selection Set**
- Authors: Xueyuan Deng, Huahui Lai, Jiayi Xu, Yunfan Zhao. Year 2020. Applied Sciences 10(6), 1968. DOI 10.3390/app10061968.
- PDF checked via archive: https://web.archive.org/web/2024id_/https://www.mdpi.com/2076-3417/10/6/1968/pdf (publisher URL returned 403 to my client). Licence CC BY [META].
- Relevance: **high**. Its rules state what a valid IFC part must contain, which is the core of a reversible decomposition.
- Seven rules: three basic rules for a valid IFC file, three extraction rules, one for redundant information. Rule 1: the partial model has one IfcProject plus the entities its attributes reference [FT] — [Deng et al. 2020](https://web.archive.org/web/2024id_/https://www.mdpi.com/2076-3417/10/6/1968/pdf)
- One ArchiCAD model tested: shopping mall, eight floors, 148,564 m2, about 101 MB, 1,862,673 instances [FT] — [Deng et al. 2020](https://web.archive.org/web/2024id_/https://www.mdpi.com/2076-3417/10/6/1968/pdf)
- Validity is by construction plus visualisation in the authors' platform. I did not confirm an independent schema validator.

**27. IFC-Based Partial Data Model Retrieval for Distributed Collaborative Design**
- Authors: Ning Gui, Chuhan Wang, Zhifeng Qiu, Weihua Gui, Geert Deconinck. Year 2019. Journal of Computing in Civil Engineering. DOI 10.1061/(asce)cp.1943-5487.0000829.
- PDF checked: https://lirias.kuleuven.be/retrieve/bfda36c5-869c-40c1-afce-77e5c15a6bf0 (accepted manuscript). Licence "other-oa" per OpenAlex; terms not read.
- Relevance: **high** as a design pattern: lightweight part plus traceability.
- The partial model is not valid IFC itself, but keeps the central model GUID and each object's GlobalID, so it "can be converted back into the IFC-validated partial model with the help of the IFC central model" [FT] — [Gui et al. 2019](https://lirias.kuleuven.be/retrieve/bfda36c5-869c-40c1-afce-77e5c15a6bf0)
- Implemented on BIMserver and tested on three projects, with size 29.5%, 52.3% and 37.3% of the central model [FT] — [Gui et al. 2019](https://lirias.kuleuven.be/retrieve/bfda36c5-869c-40c1-afce-77e5c15a6bf0)

**28. A Graph-Based Method for IFC Data Merging**
- Authors: Qin Zhao, Yuchao Li, Xinhong Hei, Mingsong Yang. Year 2020. Advances in Civil Engineering, Article 8782740. DOI 10.1155/2020/8782740.
- PDF checked via archive: https://web.archive.org/web/2021id_/https://downloads.hindawi.com/journals/ace/2020/8782740.pdf (publisher URL returned 403 to my client). Licence CC BY [FT].
- Relevance: **high**. It is the inverse operation, recombining IFC parts by graph matching without relying on GUIDs.
- Tested on a simple two-storey villa exported from Revit and ArchiCAD, in six scenarios. Reports entity counts and file sizes for merged a-b files against GUID merging, for example 21 walls in the merged result from 9 + 12 [FT] — [Zhao et al. 2020](https://web.archive.org/web/2021id_/https://downloads.hindawi.com/journals/ace/2020/8782740.pdf)
- Authors claim integrity is preserved because the whole process has no deletion of IFC data [FT] — [Zhao et al. 2020](https://web.archive.org/web/2021id_/https://downloads.hindawi.com/journals/ace/2020/8782740.pdf)

**29. A Parallel IFC Normalization Algorithm for Incremental Storage and Version Control**
- Authors: Han Liu, Ge Gao, Ming Gu. Year 2023. EG-ICE 2023, pp. 511-520; arXiv 2312.14931.
- PDF checked: https://arxiv.org/pdf/2312.14931. Licence arXiv non-exclusive [META].
- Relevance: **medium**. It offers content-based identity for subgraphs and can write a normalised IFC out.
- Treats IFC data as a graph, assigns row IDs from the hash of each node's subgraph, updates references and writes a normalised IFC file usable in Git-like tools [FT] — [Liu et al. 2023](https://arxiv.org/pdf/2312.14931)
- Tested on versions of one Revit model (115 MB source) and on 4 files, with roughly 1 GB normalised in under a minute [FT] — [Liu et al. 2023](https://arxiv.org/pdf/2312.14931)

**30. CBIM: A Graph-based Approach to Enhance Interoperability Using Semantic Enrichment**
- Authors: Zijian Wang, Huaquan Ying, Rafael Sacks, André Borrmann. Year 2023. arXiv 2304.11672.
- PDF checked: https://arxiv.org/pdf/2304.11672. Licence CC BY-NC-SA 4.0 [META].
- Relevance: **high**. It is the clearest graph-to-model rebuild, though it targets Revit rather than IFC.
- 32 apartment units from real projects in Israel, Revit 2019; 1,484 object instances exported as PLY through Dynamo; classifier and rules produce a knowledge graph with hosting and adjacency relations [FT] — [Wang et al. 2023](https://arxiv.org/pdf/2304.11672)
- A Dynamo "Reconstructor" rebuilds one apartment in Revit 2022 from the graph. For a window it needs the host wall, type and centre point. Checked by manual object-by-object comparison [FT] — [Wang et al. 2023](https://arxiv.org/pdf/2304.11672)

**31. Validation of IfcOWL datasets using SHACL**
- Authors: Sander Stolk, Kris McGlinn. Year 2020. LDAC 2020 (CEUR-WS Vol-2636). No DOI found.
- PDF checked: https://ceur-ws.org/Vol-2636/07paper.pdf. Licence CC BY 4.0 [FT].
- Relevance: **medium**. It explains why RDF round trips can fail silently.
- Authoring tools need ifcOWL converted back to STEP, and "there is no checking to ensure the output adheres to IFC" in a way tools will understand; a conversion may not fail yet the file still does not import correctly [FT] — [Stolk and McGlinn 2020](https://ceur-ws.org/Vol-2636/07paper.pdf)

**Software, not a paper**: IfcSTEP-to-IfcOWL round-trip converters by B. Zhang include an IfcOWL2IfcSTEP tool, Apache-2.0. The repository shows no fidelity measurements and cites no publication [SNIPPET] — [GitHub](https://github.com/BenzclyZhang/IfcSTEP-to-IfcOWL-converters)

**Related but not decomposition**: Massafra, Jabi and Gulli, Topological BIM for building performance management, Automation in Construction 166, 105628, DOI 10.1016/j.autcon.2024.105628, CC BY [META]. It starts from CAD-derived geometry, builds a Topologic model and reaches IFC through Revit APIs on one higher-education case study [FT] — [Massafra et al. 2024](https://cris.unibo.it/bitstream/11585/974557/1/1-s2.0-S0926580524003649-main.pdf). Relevance **low** for decomposition, though it is a working topology-to-IFC route.

**Reversibility summary**

| Work | What goes back | Output | Evidence of validity | Rebuilds geometry from the representation? |
|---|---|---|---|---|
| Buruzs 2022 | Derived IfcSpace entities | IFC via IfcOpenShell write | Not reported in passages read | Extruded spaces only |
| Kone and Mahesh 2025 | Schedule, resource, cost entities | IFC | IfcOpenShell schema check | No, reuses original |
| Deng 2020 | Filtered subset | IFC | Rules plus own platform | No, copied |
| Gui 2019 | Subset via GlobalIDs | Valid IFC only with central model | Described, BIMserver | No, needs central model |
| Zhao 2020 | Two models merged | IFC | Entity counts | No, copied |
| Liu 2023 | Whole model, reordered | IFC | Git diff behaviour | No, same data |
| Wang 2023 CBIM | Graph plus PLY-derived values | Revit, not IFC | Manual comparison, 1 apartment | Yes, through Revit families |
| IFCNet 2021 | Not reversed | One IFC per element | Not reported | Not applicable |
| Zhu 2023 | Not reversed | Graph | Forward completeness only | Not applicable |
| Hornung 2025 | Not reversed | Graph | None | Not applicable |

### Inferences
- A lossless forward map like IFC-Graph makes a reverse writer look feasible in principle, because instances, attributes and references are all retained. No reviewed paper shows it, and it would need tests for attribute order, resource entities and inverse attributes. A round-trip test on open models would be a small, publishable first experiment.
- Validity for a part requires a closure: Deng's Rule 1 plus following references. Validity for a new model requires more, because IfcOpenShell schema checks do not guarantee correct import into authoring tools, as Stolk and McGlinn warn for RDF routes.
- The bounding-box graph of Hornung et al. cannot regenerate real elements alone. A reversible design would need a pointer to the source part (GlobalId or file address, as in BIGs and Gui) or a generator that goes from box and type to an IFC element.

### Gaps
- I found no published fidelity benchmark for STEP to ifcOWL to STEP, or for IFC-Graph to STEP. This absence comes from three targeted searches and does not prove none exists.
- Krijnen and Beetz, An efficient binary storage format for IFC building models using HDF5 hierarchical data format, DOI [10.1016/j.autcon.2020.103134](https://doi.org/10.1016/j.autcon.2020.103134), is CC BY per OpenAlex, but the PDF returned 403, so I did not read it and cannot say whether it round-trips.
- Won, Lee and Cho, No-Schema Algorithm for Extracting a Partial Model from an IFC Instance Model, DOI [10.1061/(asce)cp.1943-5487.0000320](https://doi.org/10.1061/(asce)cp.1943-5487.0000320), is closed per OpenAlex, so **no open-access PDF found**. Deng et al. summarise it [FT].

## How many real models does each use, and from where?

### Takeaway
Corpora stay small and often come from private offices or the same few public models. Only IFCNet (about 1,000 models) is large in IFC terms. IFCNet, Buruzs, Zhu, Bonduel and Lamsal name or describe public sources in what I read.

### Cited Findings

All figures are [FT] from the paper records above unless marked. Links go to the same PDFs.

| Paper | Real models | Source | Units produced |
|---|---|---|---|
| [IFCNet 2021](https://arxiv.org/pdf/2106.09712) | About 1,000 IFC | Real projects, student works, online repositories | 19,613 confirmed objects, 65 classes |
| [IFCNet++ 2022](https://arxiv.org/pdf/2212.00942) | "More than ten" IFC | Not named in passages read | Objects, at most 2,000 per type |
| [Hornung 2025](https://api.figshare.com/v2/file/download/55632518) | 22 usable of 50 IFC | Architecture offices in Germany and Austria | 600,000+ subgraphs, 180,000 balanced |
| [Austern 2024](https://web.archive.org/web/2024id_/https://www.mdpi.com/2075-5309/14/2/527/pdf) | 11 BIM files | Local architecture offices | 42,000+ elements |
| [Collins 2021](https://ec-3.org/wp-content/uploads/2025/10/EC32021_168.pdf) | 22 IFC | Practitioners, Revit and ArchiCAD | Element graphs |
| [Wang and Ying 2025](https://ec-3.org/wp-content/uploads/2025/10/EC32025_286.pdf) | 5 IFC | Revit and ArchiCAD, source not named | 21,083 nodes |
| [Buruzs 2022](https://web.archive.org/web/2024id_/https://www.mdpi.com/1996-1073/15/8/2937/pdf) | 8 IFC (15 per Ziaee and Suter) | Ghent University, DURAARK | 320 spaces in the passage read |
| [Han 2025](https://arxiv.org/pdf/2509.11104) | 176 graphs, 16 annotated | Revit models, not IFC | 974,991 nodes |
| [Ziaee and Suter 2023](https://arxiv.org/pdf/2307.04515) | 68 3D models | 13 countries, BIM/CAD, not clearly IFC | 275 apartments |
| [Wang 2023 CBIM](https://arxiv.org/pdf/2304.11672) | 32 apartments | Real projects in Israel, Revit | 1,484 objects |
| [Wang 2021](https://cumincades.scix.net/pdfs/w78-2021-paper-077.pdf) | 0 IFC | Online floor-plan images | 224 layouts |
| [Zhu 2023](https://api.figshare.com/v2/file/download/62792194) | 8 IFC | KIT, Open IFC Model Repository, projects | Whole-model graphs |
| [Zhu 2024](https://arxiv.org/pdf/2405.16345) | 5 IFC | Listed in its Table 6 | Whole-model graphs |
| [Zhu 2025 pathfinding](https://www.repository.cam.ac.uk/bitstreams/17c2bdd2-2839-4c7f-ad9e-d93b1b1e0fc4/download) | 2 plus 1 modified | Institute and Dorm | Connectivity graphs |
| [Deng 2020](https://web.archive.org/web/2024id_/https://www.mdpi.com/2076-3417/10/6/1968/pdf) | 1 IFC | ArchiCAD shopping mall project | Partial IFC files |
| [Gui 2019](https://lirias.kuleuven.be/retrieve/bfda36c5-869c-40c1-afce-77e5c15a6bf0) | 3 | Described as projects | Partial models |
| [Zhao 2020](https://web.archive.org/web/2021id_/https://downloads.hindawi.com/journals/ace/2020/8782740.pdf) | 1 simple villa | Revit and ArchiCAD export | Merged IFC files |
| [Liu 2023](https://arxiv.org/pdf/2312.14931) | 1 versioned, 4 files | Revit export, others not named | Normalised IFC files |
| [Kone and Mahesh 2025](https://www.itcon.org/papers/2025_73-ITcon-Kone.pdf) | 1 | Duplex House, IFC4 | IFC' file |
| [Bonduel 2018](http://ceur-ws.org/Vol-2159/04paper.pdf) | 1 | Duplex benchmark, NIBS | LBD graph |
| [Lamsal 2026](https://arxiv.org/pdf/2605.13236) | 3, plus 10 for timing | Openly available models | SQLite plus graph |
| [Yin 2026](https://www.iaarc.org/./publications/fulltext/ISARC2026_1332.pdf) | Count not captured | UK highway models, synthetic to original 51:1 | 6,058 elements |

- Attrition in practice is high: Hornung lost 28 of 50 received files to missing classes, corruption or parsing failures, and only 24 of 148 firms responded substantively [FT] — [Hornung et al. 2025](https://api.figshare.com/v2/file/download/55632518)
- Model repositories and parsers were reported as obstacles as late as 2021: "no repository of apartment models" and "no suitable parser" [FT] — [Wang et al. 2021](https://cumincades.scix.net/pdfs/w78-2021-paper-077.pdf)

### Inferences
- Model counts and sample counts are very different things. Hornung's 180,000 samples come from 22 buildings, so effective diversity is closer to 22 than to 180,000. Reviewers will likely ask about this for any thesis dataset.
- Benchmark files such as Duplex recur across query and conversion papers, so results on them say little about messy office models.

### Gaps
- Licences of the source models are mostly unstated, so redistribution of derived parts is unclear. The data availability researcher should cover this.
- Overlap between public models across papers was not quantified.
- Searches covered OpenAlex, general web search and the PDFs above. I did not run dedicated searches of CAADRIA, ACADIA or IJAC, so spatial-graph work from those venues may be missing.
