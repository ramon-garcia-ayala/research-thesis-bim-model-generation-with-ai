## 2026-11-15 · Summary
Somepalli, Singla, Goldblum, Geiping and Goldstein (CVPR 2023). The paper asks whether diffusion models create new
images or copy their training set. The method is retrieval: for each generated image, find the most similar training
image with a feature extractor and look at the match. Ten image-retrieval models are compared on ten datasets (five
real, five synthetic made for the task) and SSCD, Swin and DINO with a split-product similarity are kept as the best.
The similarity of each generation to its closest training image is then compared with the similarity of the training
images to each other (the top-1 self-similarity), which serves as baseline: if the generations are no closer to the
training set than the training set is to itself, the model is not copying more than the data repeats itself. Three
settings: DDPMs trained on Celeb-A (300 and 3000 images, plus the full-dataset checkpoint) and Oxford Flowers (100,
1083 and 8189 images), a class-conditional latent diffusion model on ImageNet (100 random classes, 1000 samples per
class), and Stable Diffusion v1.4 searched against the 12M images of LAION Aesthetics v2 6+ with 9000 captions.

Results
- Small training sets (Fig. 3, Fig. 5): with 300 and 3000 Celeb-A images the models "blatantly copy" from their training
  images. Most samples of the 300-image model have very high similarity scores; with 3000 images the histogram moves
  to the left and blatant copies occur infrequently. With the full dataset the histograms of generations and of
  self-similarity overlap strongly, so it copies no more than the training images are copies of each other. The
  Oxford Flowers trends are similar, and the model with just 1083 images already makes unique but minor variations.
- ImageNet latent diffusion (Fig. 6): no significant copying; similarity scores never cross 0.65, and the high ones are
  very similar but never exact copies, which the authors tie to low intra-class diversity.
- Stable Diffusion (Fig. 7): images with a similarity score of 0.5 or more, about 170 images, are the top 1.88
  percentile of the random generations, and above that threshold "a significant amount of copying" is seen: verbatim
  object and background, or only the background. The conclusion is that copies "appear to occur often enough that their
  presence cannot be safely ignored".
- The authors say the numbers for Stable Diffusion underestimate replication: the search covers 12M images, less than
  0.6% of the training data, and it is likely that replication exists that the retrieval cannot identify.
- Caveat they give: sampling captions from LAION may raise the rate of replication, and duplicated training images
  (SSCD above 0.95) are part of the cause.

For the thesis
- The baseline is the transferable idea for new-not-replicated: do not read a similarity score alone, compare it with how
  similar the training models are to each other. In the thesis the training models are few (a plan of 10 models), and
  this paper shows that the smaller the set the more the model copies (300 against 3000 images), so the project sits
  on the side where copies are expected. That is an inference; the paper says nothing about buildings.
- Its measurement needs a feature extractor that says what "similar" means (SSCD for pixel copies, DINO for semantic
  ones, and the two flag different images). For Revit graphs there is none; choosing it would be the thesis's own work.
- The 0.5 threshold is read off the examples (the authors look at the images above it); the paper gives no null
  distribution for it, which is the gap that majhi-2026 addresses.
- Images only. It also does not measure validity, so "new and valid" is not tested.
