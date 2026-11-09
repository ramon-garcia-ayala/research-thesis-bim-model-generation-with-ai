## 2026-11-08 · Summary
Three steps to fill in the room function of an IFC model. (1) Derive IfcSpace entities from the walls of each storey and
write them back into the IFC file with ifcopenshell. (2) Build an accessibility graph: spaces are nodes, joined if they
touch or are connected by a door, an opening or stairs. (3) Classify each space with a graph convolutional network (GCN)
on geometric features, using the graph for context. The authors add a weighted GCN (WGCN) with separate weights for a
space and for its neighbours. Data: labelled spaces from residential IFC models found online.

Results
- Dataset: eight free residential IFC models (Ghent University and duraark repositories), 320 spaces, 13 room types, a
  random 80/20 split. Accuracy 62% on the validation part and 72% on all the data.
- Inductive test: trained on 1500 spaces of nine proprietary IFC files, tested on six other files. Total accuracy: MLP
  38.3%, GCN 37.6%, GCN plus MLP 45.0%, WGCN 50.0%. By file, WGCN ranges from 35.0% to 78.6%.
- Merging room types into three aggregate classes raised the accuracy to 64%, with the WGCN of layer size two.
- Bedrooms were the most common type and the most often misclassified. Corridors were taken for foyers 14 times.
  Bathrooms and storage rooms were confused 21 times.
- Eight or 15 models? The labelled set is eight models. The inductive test uses 9 + 6 = 15 files. Fifteen is also the
  number of room labels listed in 3.3.

For the thesis
- A precedent for writing a derived entity back into IFC: new IfcSpaces from wall geometry, extruded to the storey
  height. It writes only the spaces. The paper does not say the predicted function is stored in the IFC.
- A second graph recipe, with relations computed from geometry instead of read from IFC. It labels nodes. It does not
  generate, and it measures no validity.
- Its own limits matter for the data side: the spaces of one model are highly correlated, and a few IFC files give few
  independent samples. This supports splitting by project.
- Only six real test models, with no variance reported. Treat the accuracies as an order of magnitude.

Doubts from reading it (Claude's, not the paper's)
- The text says "With GCN, we reached an average classification accuracy of 50%". In Table 1, 50.0% is WGCN, and GCN is
  37.6%.
- The abstract says the weighted GCN gave "a slight improvement". In Table 1 it is 50.0% against 37.6% for the GCN and
  38.3% for the MLP. In two of six files WGCN and MLP are equal.
- Room types: 13 in Section 4, 15 labels in 3.3, 16 outputs for the MLP, and "γ = 1 ... 15" for the softmax.
- The 80/20 split mixes spaces of the same models, which the authors criticise in other work (Section 2). The nine
  training files are proprietary, and the Data Availability Statement says "Not applicable".
- Table 1's caption cites Kipf and Welling as [11]. Reference 11 is Open CASCADE. It should be [19].
