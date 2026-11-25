## 2026-11-15 · Summary
Author: main reference for MaskPLAN, to be kept on the map.

[MaskPLAN — Masked Generative Layout Planning from Partial Input (CVPR 2024)](https://www.youtube.com/watch?v=HuzoJdMWnRM):
the presentation video of the paper, by its authors Hang Zhang, Anton Savov and Benjamin Dillenburger, Digital Building
Technologies, ETH Zurich. Channel Digital Building Technologies, published 2024-06-19, 4 min 40 s. Only the title,
channel, date and description were read; the video itself and its transcript were not (YouTube gave no transcript to a
script), so nothing below is from what is said in it.

Where the rest is
- Paper: Zhang, Savov and Dillenburger, *MaskPLAN: Masked generative layout planning from partial input*, CVPR 2024,
  pp. 8964–8973, doi:10.1109/CVPR52733.2024.00856. Open access at the
  [CVF](https://openaccess.thecvf.com/content/CVPR2024/html/Zhang_MaskPLAN_Masked_Generative_Layout_Planning_from_Partial_Input_CVPR_2024_paper.html).
  Not read, and not in the library yet.
- [Poster at CVPR 2024](https://cvpr.thecvf.com/virtual/2024/poster/31566).

What MaskLayout (zhang-2026), by the same group, says about it
- It formulates plan synthesis as masked completion over heterogeneous attributes, to support iterative refinement from
  partial specifications (§2.1.1).
- It predicts the layout attributes in the order {T, C, A, S, R} (type, centre, adjacency, size, region), with a
  partly masked input U as a global prior for the whole process (§2.4.2). See prediction-formulations.
- It is one of the six baselines of MaskLayout (Table 1). MaskLayout's authors say it has 542.1M parameters against
  164.3M, 127 h of training against 32 h, and a multi-encoder, multi-decoder design (§3.6); that MaskPLAN and WallPlan
  often fail to align rooms and leave rooms missing when given only the boundary (§4); and that an autoregressive
  transformer "similar to MaskPLAN" scores worse than their bi-directional one (4.84 against 4.02 FID, Table 2). These
  are the claims of its successor's authors, in a comparison they ran.

For the thesis
- The closest published case of masking-training on floor plans, and the first thing to read before deciding what to
  hide and in which order of attributes.
- Read the paper before citing any of the above as MaskPLAN's own claim. Open questions for it: how the masks are chosen
  in training, what the prior U holds, and whether the order {T, C, A, S, R} is fixed or learned.
