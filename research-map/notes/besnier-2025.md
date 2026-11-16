## 2026-11-15 · Summary
Besnier, Chen, Hurych, Valle and Cord (ICLR 2025). MaskGIT generates an image by starting with
all tokens masked and unmasking some of them at each of S steps. This paper is about the scheduler that picks which
positions to unmask at each step. The original Confidence scheduler unmasks the tokens the model is most sure of; the
authors analyse the sampling through the mutual information between tokens and show that it picks clustered tokens (the
neighbours of tokens already known are the most certain), so each step brings little new information and the
high-entropy regions are left for the last steps. The released MaskGIT code hides a fix that the original paper does not
mention: Gumbel noise added to the confidence. They propose the Halton scheduler: positions follow a low-discrepancy 2D
Halton sequence (bases 2 and 3), a fixed order that spreads the unmasked tokens over the image so that those filled in
the same step are far apart and weakly correlated. It needs no retraining and no noise, and is a drop-in replacement.
Tested for class-to-image on ImageNet (256x256 and 512x512) and text-to-image on COCO.

Results
- ImageNet 256x256 (Table 1, own MaskGIT, FID, lower is better; Confidence / Random / Halton): 484M parameters, 32 steps:
  7.5 / 9.7 / 5.3. 705M parameters, 12 steps: 6.80 / 7.90 / 6.19. 705M parameters, 32 steps: 5.93 / 6.33 / 3.74.
- The text gives "-2.19 FID improvement over the Confidence Scheduler" at 256x256, and -2.27 FID at 512x512 with the
  pre-trained MaskGIT of a public reproduction, with no retraining and 32 steps.
- Steps (Fig. 5): the Halton scheduler improves as steps increase, while the Confidence scheduler gets worse; Halton
  is consistently better than Confidence when the number of steps exceeds 12.
- Text-to-image on COCO, zero-shot (Table 4): 10.1 lower FID than aMused, the only open-source text-conditioned MaskGIT,
  and a further reduction of 2.7 in FID against the Confidence scheduler.
- The text says its MaskGIT implementation lowers the FID of the original by almost 40% and raises IS by over 50%
  (Table 3), and that masked generative transformers still underperform diffusion models.
- Fig. 10: in one example most of the image is fixed after a few steps: colour at 4 steps (25/1024, about 2% of tokens
  unmasked), shape at the 8th step (8%), texture starting at 12 steps (16%).

For the thesis
- It answers a question that the "all at once, then refine" case of placement-order-experiments leaves open: when many
  elements are predicted together, which ones to fix in each step. Choosing by confidence puts together elements that
  are next to each other and strongly correlated; choosing them spread apart works better in this paper.
- For a building the analogue would be to place together elements that do not depend on each other (two walls of
  different rooms) and to place neighbours in different steps. That is an inference; "positions" here are cells of a
  grid of 1024 tokens (Fig. 10), and a Revit model has no grid of positions, nor a fixed number of them.
- It points to a variable to log in the experiment: the scheduler and the number of steps, since a confidence rule
  degrades with more steps.
- It is images, and the quality measure is FID and diversity of pictures, not whether a result is new or copied.
