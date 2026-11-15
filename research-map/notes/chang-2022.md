## 2026-11-15 · Summary
Chang, Zhang, Jiang, Liu and Freeman (Google Research, CVPR 2022). MaskGIT generates images with a bidirectional
transformer over the discrete tokens of an image (a VQ tokenizer, 256 tokens for a 256x256 image). Training is the
BERT-style task of predicting randomly masked tokens, with a mask ratio drawn at random in [0, 1) so that the model meets
every stage of decoding. Decoding starts with all tokens masked: in each of T iterations the model predicts all tokens at
once, keeps the most confident ones and masks the rest to be predicted again, with the masked share going down by a mask
schedule until none is left. It uses T = 8 iterations, against the 256 steps of a transformer that decodes in raster order
(VQGAN). The same model does inpainting, extrapolation and class-conditional manipulation by starting from a partial
token grid. Tested on ImageNet at 256x256 and 512x512.

Results
- Speed: 8 steps instead of 256; the runtime comparison with VQGAN's decoding shows a speedup of 30 to 64 times, larger as
  the image gets bigger (Fig. 4). The abstract says it accelerates autoregressive decoding by up to 64x.
- Quality on ImageNet 256x256 (Table 1): FID 6.18 against 15.78 for VQGAN, Inception Score 182.1 against 78.3. At 512x512,
  MaskGIT improves BigGAN's FID and reaches 7.32, given as a new state of the art. The 256x256 figures are without beam
  search, top-k or classifier guidance.
- Mask schedule (Table 3, best FID of each function and the number of iterations T that gave it): cosine 6.06 (T = 10),
  square 6.35 (10), cubic 7.26 (9), linear 7.51 (16), exponential 7.89 (8), square root 12.33 (32), logarithmic 29.17
  (60). Concave functions (cosine, square) do best; cosine is the default.
- More iterations are not better: for each schedule the result peaks and then gets worse. For cosine the best number is
  8 to 12 iterations (Fig. 8).

For the thesis
- The method behind the "all at once, then refine" case of placement-order-experiments: predict every hidden position in
  parallel, keep the confident ones, re-predict the rest. The paper contrasts it with one-by-one decoding in a fixed
  order (raster) and finds it both faster and better on its metric.
- It is the same masking as in masking-training and the same model, so one trained model serves training and generation.
  The mask ratio drawn at random at each training step is another answer to "how much to hide" than a fixed share.
- It is images: tokens on a regular grid, a fixed number of positions (256), no relations between elements. A Revit model
  has a variable number of elements with host and adjacency relations, and which "positions" are to be unmasked is not
  defined. The Halton scheduler paper (Besnier et al. 2025) addresses which positions to pick per step; it is not in
  the library.
- The number of steps (8) is the cost of refining; each pass is a forward pass of the model, and each placement through the
  MCP server would be a Revit call, so the count of iterations also counts calls.
- Nothing in it measures whether the result is new or copied.
