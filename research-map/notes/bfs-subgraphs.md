## 2026-11-15 · Summary
Author: wants "subgraphs by BFS" on the map, with Hornung and Bu et al., as the way to cut a Revit model into pieces a model can
handle, and as the answer to the cap on elements that MaskLayout needs (14 rooms).
Sources: the preprocessing of Hornung et al. 2025 (hornung-2025) and Bu, Mehrab and Karpatne 2023 (bu-2023), read in the
library; the plain explanation of BFS is general background.

What it is
- BFS, breadth-first search, walks a graph in rings: start at one node, take every neighbour, then the neighbours of those,
  and so on. Stopping when 20 nodes are gathered gives a subgraph: a local piece of the model with its relations.
- Its opposite is DFS, depth-first search, which follows one chain to its end before coming back.

Two different uses of BFS, easy to mix
1. To cut the pieces (Hornung). The 109 building graphs (the real IFC models after rotating and mirroring) were split with
   "a modified Breadth-First Search (BFS) algorithm applied to each node, performing a constrained traversal" into subgraphs
   of 20 nodes: over 600,000 of them. Then nodes were removed from each to make 1.8 million pairs of partial graph and
   removed node, and a balanced 180,000 (IFC_180k).
2. To order the steps. Hornung also removes nodes in three orders: hierarchical BFS (a prioritised start), random BFS and
   minimum node degree, and gets three datasets that behave differently. Bu et al. compare BFS, DFS, sorted and
   learned orders as the sequence in which an autoregressive model generates a graph: BFS 0.0893 and DFS 0.0761 against 0.0075
   for their latent sort on the Toulouse roads (Table 1, lower is better). They say BFS and DFS do fine when a distribution
   is wanted and badly when an exact target graph is needed.

For the thesis
- It is the cutting rule behind "take the graph apart" (deconstruct-for-training) and a way round the fixed shape of MaskLayout
  (14 rooms, 6 attributes): 20 nodes per piece is close to its window, and what is missing is padded *(my reading)*.
- Each model gives many pieces, depending on where the traversal starts. The unseen model of the 10 must give none to training.
- Open, the author's ideas (tentative):
  - Levels and grids as a condition that is always given and never hidden, like the site in MaskLayout, so a piece sees the
    global structure; or predicted too, since grids carry structural logic. Not decided.
  - How to join the pieces without contradictions: each new piece predicted with the neighbouring elements already placed as
    given input, as in the confidence loop of MaskLayout (masklayout-model-pipeline) *(my reading)*.
  - Staged classes, to try one after another: 1 slab and programme (schematic limits), 2 structural, walls and columns
    (physical limits), 3 hosted, doors and windows. See the deck notes in memory; not on the map as a node yet.
- Caveat on Bu et al.: a preprint under review, on roads, scenes and circuits, with the metric of distance to one target graph.
