## 2026-11-15 · Summary
Fig. 3 of [MaskLayout](https://doi.org/10.1016/j.autcon.2026.107120) (zhang-2026), "Data preparation pipeline", with
the method of its section 3.1, "Layout representation". It shows how one apartment of the SwissDwellings dataset is
turned into the tensors the model trains on, and where the masking acts. Sizes and counts below are the paper's.

(a) From a whole floor to one apartment
1. The source is a full floor with several apartments and a public space (SwissDwellings, more than 50k layouts, north
   always up).
2. *Apartment region parsing*: the public spaces are extracted, each apartment is taken on its own, and the rest of the
   floor (the neighbouring flat) is kept only as a grey "existing flat" mask. The front door and the boundary stay.
   That mask tells the model which edges of the boundary cannot have windows.
3. *Scaling and positioning*: the apartment is centred on a fixed-scale image canvas, rooms are tagged with a colour per
   type (living room, bathroom, closet, bedroom, kitchen, dining room, balcony, corridor).
4. Filters: site boundary within 20 × 20 m and at most 14 rooms per layout. Left: more than 43k apartments, split
   80, 10 and 10 per cent for training, validation and test (§3.6).

(b) One plan, two modalities, six attributes
- The site condition B is a 128 × 128 × 4 image: boundary (127), entrance (255) and the adjacent flat (255 in the last
  channel). It is given to the model as a condition; the masking acts on the layout attributes L, not on B.
- Each room has six attributes, L = {T, C, S, A, W, R}, written twice:

| Attribute | Vector form | Image form |
|---|---|---|
| T room type | one-hot, 14 × 8 | the room's colour tag over the boundary |
| C room centre | x, y as 7-bit integers, 14 × 2 × 7 | a 9 × 9 square at the centre |
| S room size | 6-bit integer from the area in m², 14 × 6 | the pixel area of the room, centred, with no position |
| A adjacency | binary matrix, 14 × 14 | 9 × 9 squares joined by lines 2 pixels thick |
| W windows | x, y of each window, 7 bits, 14 × 2 × 7 | 9 × 9 squares at the window positions |
| R region | up to 20 corners per room, x, y, 14 × 20 × 2 × 7 | the pixels the room occupies |

- The image modality is 14 images of 128 × 128 × 4 per attribute, one per room index. Rooms past the real count, and
  rooms with no window, are zero-padded ("None padding" in the figure).
- The layout is then read as a graph: a node per room carrying its attributes, edges for adjacency.

Masking on that graph (figure, top right)
- Partial graphs are made from the full one by dynamic masking, in two levels: *graph level* hides a whole room, every
  attribute of a node; *node level* hides single attributes of a room. The partial graph keeps, for example, only
  {C, A, W} of some rooms (§3.4.2). The masked parts are replaced by a [mask] embedding and the model predicts them.

For the thesis
- It is a worked decomposition recipe, close to the first half of the research question: an element is cut into a fixed
  set of attributes, each with a fixed shape and a padding value, so that "hide part of it" is a plain substitution.
  The masking-training choices (a whole element or one of its attributes) are here the two masking levels.
- The padding and the fixed maximum (14 rooms, 20 corners) are what make the tensors regular. A Revit model has no such
  maximum, so this is a design decision the thesis has to take *(my reading)*: how many elements and how many
  attributes per element, and what happens to the rest.
- The attribute set maps loosely to Revit *(my suggestion, not the paper's)*: type to family type, centre and region to
  location and geometry, size to dimensions, adjacency to the typed relations, windows to hosted openings.
- The condition B (boundary, entrance, neighbours) is the part that is given and not hidden. In a Revit model that role could be
  played by levels, grids and the shell.
- Source of the image: the author's capture of Fig. 3 of the open-access paper (CC BY 4.0).
