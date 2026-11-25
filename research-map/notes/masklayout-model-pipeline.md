## 2026-11-15 · Summary
Author: wants the way MaskLayout turns a plan into tokens, masks them, predicts and rebuilds the plan as a quick
reference on the map, and to see whether the technique can go in the next deck (presentacion-05).
Source: §3.4 "Dual-modality masked generative transformer" of [MaskLayout](https://doi.org/10.1016/j.autcon.2026.107120)
(zhang-2026), read in a Spanish translation. Sizes are the paper's. §3.3 (the VQ image generator) is in the note
vector-quantization. The data side (six attributes, 14 room slots, padding) is in masklayout-layout-representation.

The order, from the plan to the plan again
1. Cut the plan into attributes (§3.1, before the model). Each of up to 14 rooms gets six attributes
   L = {T type, C centre, S size, A adjacency, W windows, R region}, each written as a vector and as an image. This is
   preparation, not decoding: nothing is decoded yet.
2. Encode to tokens (MFE, the encoder). Vector side: six small encoders, one per attribute, each gives a (14, h)
   sequence; joined they make (84, h). Image side: the 84 attribute images are turned into 5 × 5 codebook tokens by a
   pretrained VQ model that stays frozen, and an encoder I gives (85, h), where the last element is the site image.
   The site is added to the vector side too, so both are (85, h) and are summed element by element into one sequence of
   85 positions, plus positional embeddings. One position is one attribute of one room (or the site).
3. Mask (training). Positions are not taken out of the list: they are replaced by a learned [mask] embedding, so the
   sequence is always 85 long. Two levels: graph level hides a room (its six attributes), node level hides single
   attributes. The share hidden is not fixed: it follows a Gaussian schedule over the masking steps. At inference the
   masked part is whatever the user did not give (the partial input).
4. Predict. A bidirectional transformer (ViT-Base sized, as in BERT and MaskGIT) reads the 85 positions and fills
   every masked one in the same pass (non-autoregressive). Three attention masks steer it: PIM (only the given input),
   GSM (same room and adjacent rooms), AWM (same attribute kind).
5. Decode (MFD, the decoder). The same hidden (85, h) goes to two heads. Image head: MLP and Unflatten to 5 × 5
   codebook tokens, then the frozen VQ decoder paints the image. Vector head: conditioned on the image head, MLP, then
   split into the six attributes, which are read back into the plan.
6. At inference this repeats. Each round predicts everything masked, keeps only the room it is most confident about (the
   confidence comes from the image head, before Softmax), and goes again with that room given. Room by room, as in
   MaskGIT, at graph and node level.

So the chain is: attributes → tokens → mask → predict → decode. The encoder is on the way in and the decoder on the way
out; the plan is rebuilt by the decoder, not by an encoder.

Two things that are easy to read the other way
- The vector side is continuous embeddings from a linear layer, not discrete tokens; only the image side has discrete
  codebook indices *(my reading of the text)*.
- Masking at training and the confidence loop at inference are two different things: the first teaches, the second
  builds.

For the thesis
- It is the whole of step 04 in one model: cut the element into fixed attributes, hide some (an element or an attribute
  of it), predict. The two masking levels answer, in a floor-plan case, the open question of masking-training (what is
  hidden).
- The decoder end is what step 05 would replace: here the vector head is read back into a plan; for Revit the predicted
  attributes would become calls of the MCP server (mcp-assembles-in-revit), with rebuild.py as the control.
- The confidence loop (keep the surest room, then predict again with it given) is a ready-made version of "one and then
  its neighbours" in placement-order-experiments, with a rule for which one goes next *(my reading)*. Besnier et al.
  (besnier-2025) is about that rule.
- Limits for Revit *(my reading)*: 14 rooms and six attributes is a fixed shape, a Revit model has no such maximum; and
  a pretrained VQ for images is a part a first version can leave out and keep only the vector side.
