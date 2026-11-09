## 2026-10-22 · Summary
Alibaba / Simon Fraser. Real CAD drawings from over 100 projects (housing, schools, hospitals, malls, offices,
underground parking): `.dwg` parsed to `.svg`, split by layer, labeled line by line in 35 categories. Defines
panoptic symbol spotting (countable things like doors and toilets, uncountable stuff like walls and parking).
PanCADNet: CNN backbone plus a GCN over lines and arcs. Annotation: "11 specialists spend over 1,000 hours". For
privacy, texts are removed and plans cut into 10 m blocks, of which "only 30% of the blocks are kept".

Results: semantic spotting F1 0.806 (GCN) vs 0.688 (best CNN); walls 0.814 vs 0.634. Template methods "perform
poorly" because drawings come from many vendors with no standard templates. Year and venue not printed in the PDF.

For the thesis
- The closest input domain to a DXF-based tool: vector CAD with walls and parking, non-residential typologies.
- Quantifies the manual route (11 people, over 1,000 hours, 70% of the data discarded). A generator gives the same
  entity-level labels for free because it knows what it placed (inference).
- Vector + graph representations beat raster: an argument for exporting the engine's JSON as graphs.
