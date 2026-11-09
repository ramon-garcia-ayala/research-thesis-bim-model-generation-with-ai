## 2026-11-08 · Summary
A short conference paper from the University of North Carolina at Charlotte. Prototype tools, written with PyRevit (Python
inside Revit), read data out of Revit models and store it in one MongoDB database. The source is an archive of
"approximately 300 design models" from one firm, Little, called "an initial data set", with "a widely varying number of
backups" per model and standards "loosely adhered to". Three tools: a Family Harvester adds a standard parameter to
families, a Room Harvester stores each room as one document, and the data is shown as TreeMaps and in Tableau.

Results
- No evaluation. The test bed is "five example Revit models", Rooms and Room Tags only.
- One worked example: a seat-count parameter, filled in by hand for furniture families, summed per room and level (Fig. 3).
- Time savings are stated, not measured: a benchmarking task of "multiple employees, weeks" takes "minutes"; a two-week
  comparison by one employee takes "seconds".
- Future work: link budgets, change orders and consultants to the database, run machine learning on it, and use natural
  language processing tools to rename items.

For the thesis
- The closest precedent of a lake of Revit models, and it comes from a practice, not from a released dataset.
- It names the dirt the thesis expects: inconsistent names and parameters despite firm standards, duplicate object IDs in
  ODBC exports, many backups of one model. Its answer is to rewrite parameters inside the models.
- It extracts per element, not per part. Rooms keep "parent/child relations" to the elements inside them, but nothing
  decomposes a model into reusable parts, and nothing generates a model.
- It writes no IFC, checks no validity, and does not split by project. Backups of one project are a leakage risk for any
  training split; the paper does not discuss it.
- A document database (each room a document) lets models with different fields sit together. No schema or code is given.
