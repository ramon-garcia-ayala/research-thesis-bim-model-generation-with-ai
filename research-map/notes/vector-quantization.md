## 2026-11-15 · Summary
Author: wants vector quantization (VQ) on the map as a quick reference, and asks whether images turned into tokens could
one day replace clean datasets such as Swiss Dwellings.
Source: §3.3 "Pretrained quantized model", §3.5.1, §3.6.1 and the ablation of Table 2 of [MaskLayout](https://doi.org/10.1016/j.autcon.2026.107120)
(zhang-2026), plus MaskGIT (chang-2022). The explanation of what a VQ is, is general background, not the paper's text.

What it is
- A codebook of K learned entries, each a small pattern. An encoder compresses an image to a small grid of vectors, and
  each cell is replaced by the nearest codebook entry. The image becomes a grid of integers (tokens); a decoder turns the
  integers back into an image. Lossy, but the tokens can be masked and predicted like words.
- Three losses train it (§3.5.1): reconstruction, the VQ loss (pulls codebook entries towards the encoder's outputs) and the
  commitment loss (keeps the encoder from jumping between entries).

In MaskLayout
- Why: one layout is 85 images of 128 × 128 × 4, "larger than a single 1024 × 1024 image" (§3.3), too heavy to train a
  transformer on directly. A VQ-VAE (the original one, ref. [55] of the paper) squeezes each image to a 5 × 5 grid of
  tokens, I in Z^(5×5). The size 5 × 5 was chosen by trying strides and padding of the convolutional layers.
- It is pretrained and then frozen: 60 epochs, about 51 h, on one RTX 4090; turning the 3.4 M images into tokens took 59 h
  more (§3.6.1).
- The transformer predicts the integers; the frozen VQ decoder paints the image from them (§3.4.4).
- Discrete matters: replacing the VQ-VAE with a plain VAE gives FID 24.52 against 4.02 (Table 2, "w VAE (not VQ)", lower
  is better), the largest drop in the table.
- K, the size of the codebook, is named in §3.3 (pp. 6-7) and in the loss of §3.5.2, but no number is given in the text.
  If the value is needed, look in Fig. 4 or in the authors' code, if published.
- MaskGIT does the same with a 16 × 16 grid (256 tokens) for a 256 × 256 image.

For the thesis
- Not needed for the Revit JSON *(my reading)*: a family type is already a category, and coordinates and dimensions can be
  rounded to integer bins, as MaskLayout does with its 7-bit centres.
- The images of MaskLayout are not a replacement for clean data: they are drawn from the structured Swiss Dwellings plans
  (types, polygons, windows). The image branch exists because it helps with irregular sites, and the paper adds a vector
  branch because pixels are hard to turn back into clean polygons (§3.7.1).
- Open, the author's idea: tokens from images when there is no clean dataset. It would need the image to be read into
  elements first (segmentation), and what comes out would be an image again that has to be turned into elements, the
  problem of §3.7.1. Not tested by any paper in the library *(my reading)*.
- A VQ does not need images. The reference list has SkexGen (Xu et al. 2022, ICML), which generates CAD construction
  sequences with disentangled codebooks. Not read; a candidate if the thesis wants a codebook of shapes learned from vector
  data.
