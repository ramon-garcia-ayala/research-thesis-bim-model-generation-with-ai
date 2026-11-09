## 2026-11-08 · Summary
Trains large language models on IFC to infer information missing for automated compliance checking, comparing encoder
and decoder architectures and several text forms of the same data. The dataset has 422 IFC models of office and
residential buildings from student projects, split into 338 for training, 42 for validation and 42 for testing.

Results: a modified ifcJSON form improves on EXPRESS in most tests. With one space masked it scores 58.96 against 43.52
for EXPRESS (values read from the paper's table in the research notes); with all spaces masked EXPRESS does better.

For the thesis
- The closest evidence on how the text form of a model changes what an AI can learn from it.
- A warning for the pipeline: the changes that help the model complicate lossless conversion back to IFC.
- It fills in properties with the geometry removed. It does not generate elements or buildings.
