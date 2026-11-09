## 2026-11-08 · Summary
A pipeline that lets people ask questions of an IFC model in natural language. It converts the IFC file to a linked-data
knowledge graph (IFC-to-LBD converter), has an LLM write SPARQL queries, then aggregates the results into an answer.
The authors state that applying LLMs directly to IFC files has proven ineffective, because of data volume, lack of
semantic structure and relational complexity. Evaluated on 28 questions about one multi-storey building in Barcelona,
judged by three BIM experts as correct, partial or incorrect.

Results: promising for direct questions, about entities and properties explicit in the graph. Indirect questions were
often unsatisfactory, especially with advanced spatial reasoning. Many errors came from wrong SPARQL retrieval; prompt
token limits keep the whole ontology out of the context.

For the thesis
- Supports the first half of the hypothesis: decompose the model into elements and relations before an AI reads it.
- It reads models; it does not generate them. That the graph is enough to build something similar is still untested.
- The spatial reasoning failures are a warning: layout decisions depend on the kind of relation that failed here.
- The claim about raw IFC is a remark in its introduction (DeepSeek reads about 1% of a 10 MB file; GPT-4o counts walls
  but cannot reason about their levels), not a measured comparison: the evaluation has no baseline. Do not cite it as a result.
