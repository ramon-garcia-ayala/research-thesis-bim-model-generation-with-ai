## 2026-11-08 · Summary
A round trip between IFC and a knowledge graph, to add project data to a BIM model. IFC elements and storeys become RDF
individuals in a small ontology (BIMOnto). A second ontology (IproK, from the authors' earlier paper) holds tasks,
resources and costs. The graphs are merged, and an IfcOpenShell script reads them with SPARQL and writes IfcTask,
IfcTaskTime, IfcResource, IfcCostItem and relationship entities into a copy of the IFC. One case: a Duplex House model
(IFC4 Add2 TC1), with a schedule, resources and costs the authors built by hand.

Results
- The IproK graph has 120 task instances. Elements were linked to tasks by hand in Protégé.
- Direction 1 was checked by eye in Protégé and by two SPARQL queries (elements per storey, wall net volume per storey).
- Direction 2 was checked by Algorithm 3, a script that reads the new IFC and lists what is linked to one beam: four
  tasks, each with three cost items, three of them with one resource.
- No timings, model sizes or error rates. Scalability is "not quantitatively tested".

For the thesis
- It is the write-back half of the hypothesis, but of another thing: it adds process data to elements that exist. It
  generates no elements or geometry, and nothing is learned from models.
- It lists the entities and relations to write (IfcRelAssignsToProduct, IfcRelAssignsToProcess, IfcRelAssignsToControl,
  IfcRelSequence): writing relations, not property sets.
- Its check is its own script reading the data back. It shows the data arrived, not that another tool accepts the file.
- One model, one building type, one beam in the output, no split by project.

Doubts from reading it (Claude's, not the paper's)
- Section 4.4.2 says the output is also validated against the IFC schema with IfcOpenShell. No result of that is shown.
- The text says the data is completely integrated, yet Listing 4 prints "No assigned resources found" for the fourth task.
- Section 4.3.1 names the link assignToProduct; Section 5 and Figure 11 use AssignToProcess for it.
- The Appendix A script takes one element GUID, so the file holds tasks for one element, not for the whole 120-task graph.
