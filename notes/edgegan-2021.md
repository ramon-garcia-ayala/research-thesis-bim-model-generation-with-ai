## 2026-10-22 · Summary
Vectorization as image-to-image translation: EdgeGAN (pix2pix-based) maps a colorful plan to one channel each for
walls, windows and doors; a connective graph (Laplacian) checks that subspaces close; a GNN classifies room types.
Data: 10,800 private customer plans. Wall labels come from the authors' own rule-based pipeline; doors and windows
by hand, adjusted to the walls when they disagree.

Results: about 40% of outputs usable with a few fixes, 55% noisy, 5% seriously wrong (mostly sloping walls, fewer
than 100 training samples). 32 fps vs 2 fps, "about 15 times as fast". Room classification GNN 84.35% vs CART
79.66%. Slightly less accurate than the deep-learning pipeline.

For the thesis
- A working case of a rule-based pipeline as the labeler: rules make the data, ML makes it fast.
- The risk too: the network inherits the rules' errors, and rare cases (sloping walls) fail, so a generator should
  cover the long tail on purpose (inference).
