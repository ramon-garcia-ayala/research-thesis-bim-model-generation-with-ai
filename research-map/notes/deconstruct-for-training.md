## 2026-11-08 · Summary
How Hornung et al. (2025, §3.3) turn building graphs into training examples, in two phases:
1. Graph splitting: a modified Breadth-First Search divides each of the 109 building graphs into subgraphs of 20 nodes.
   Over 600,000 subgraphs.
2. Graph deconstruction, inspired by DGMG: nodes and edges are removed step by step. The partial graph is the input and
   the removed node is the answer to learn. Over 1.8 million pairs.

The order of removal is a design choice: hierarchical BFS, random BFS or Minimum Node Degree, none of which splits the
graph into disconnected parts. Walls and spaces were over-represented, so over- and undersampling gave IFC_180k
(180,000 samples, at most 30,000 per node type) and IFC_18k for evaluation.

Limits stated by the authors: only node storage is kept, leaving out edge deletion and the termination probability.

For the thesis
- The most direct method for the question: decomposition is what produces the training data.
- The removal order changed the data: the cluster analysis shows hBFS differing markedly from the other two. It can be
  an experimental variable.
- Do not read 180,000 as independent examples: they all come from 22 files, and their cluster analysis shows a skewed
  distribution and limited diversity.
