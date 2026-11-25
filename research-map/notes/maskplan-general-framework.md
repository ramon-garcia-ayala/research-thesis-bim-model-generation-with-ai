## 2026-11-15 · Summary
Author: the slide "Method: General Framework" of the CVPR 2024 presentation of MaskPLAN
(maskplan-cvpr-2024-video). It is not a figure of the paper; it comes from the video, which explains how the tool
works in short. The author wants this pipeline in the research, to look into the process it uses. What follows is
read off the slide alone: the video's words and the paper were not read.

What the slide shows
- Two inputs. The partial input U is a table with one column per room (the slide shows 8) and a row for each of type T,
  location C, size S and region R, plus a triangular adjacency table A. Yellow cells are the values the user gives. An
  encoder E_U turns U into a latent, drawn as z. The boundary input B (a plan outline with the entrance in red) goes
  through its own encoder E_B.
- Five modules in a chain, one per attribute: G_T (type), G_C (location), G_A (adjacency), G_S (area) and G_R (region).
  Each one takes the concatenation of U's latent and B's encoding, and the outputs of the modules before it, joined by
  concatenation and by cross-attention. The legend shows three symbols: concatenation, cross-attention, module output.
- The outputs are drawn as: a row of coloured cells for T; a stack of 2D grids for C; a binary matrix for A; stacks of
  2D grids for S and R. A "× 10" sits beside the stacks of C, S and R; the slide does not say what it counts, and the
  numbers inside the grids (26, 18, 35; 62, 43, 31; 21, 13, 49) are not explained either.
- Two stages are named: G_G(B) = {T, C, A} gives the layout graph G, and G_{S,R}(B, G) = {S, R} gives the final layout
  L. In the bottom row: B, the list of rooms with their types (bedroom, bathroom, bedroom, balcony, living room,
  kitchen, and two empty slots), the room locations as dots, the graph G with its edges, the sizes as squares, and L.

For the thesis *(my reading of the slide)*
- The order of the attributes, T, then C, then A, then S, then R, matches what MaskLayout reports for MaskPLAN in its
  §2.4.2 (prediction-formulations). The slide adds a grouping: the topology first (what rooms there are, where, joined
  to which) and the geometry after (size and shape), with the geometry conditioned on the graph.
- That is a structure-first order: graph, then geometry. For a Revit model it would be elements and relations first,
  then dimensions and shapes. It is a fourth order to try beside the three of placement-order-experiments.
- The partial input U is how a user, or an experiment, fixes some values and leaves the rest to the model. How U is
  built during training is not on the slide.
- Eight room slots here, against 14 in MaskLayout, and no windows: compare with masklayout-layout-representation.

To look into (the questions this slide leaves open, for the MaskPLAN paper and the video)
- What the encoders E_U and E_B and the latent z are, and whether the modules are one network or five.
- What "× 10" counts and what the numbers in the grids are.
- How the masks of U are chosen in training, and how much of U is given at test time.
- Whether the chain really predicts each attribute from the ones before, and what cross-attention reads from.
- How the final layout L is made from S and R, and how validity is checked.

Where the related work already is
- Same group and the next step of this pipeline: MaskLayout (zhang-2026, in the reader) and its Fig. 3
  (masklayout-layout-representation); the five formulations in prediction-formulations.
- Plan datasets: msd, resplan-2026, cubicasa5k-2019, floorplancad-2021, park-2024, pinki-2024 (in the reader or the map).
- Graph masking on room graphs: tang-2024 (GTGAN++, which builds on House-GAN).
- Not in the library yet: the MaskPLAN paper, RPLAN, Graph2Plan, WallPlan, iPLAN, HouseDiffusion and House-GAN.
  Graph2Plan has a card in research_notes/Descomponer IFC reales y generar nuevos/assembly_methods.md.
