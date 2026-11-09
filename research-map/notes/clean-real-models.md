## 2026-11-08 · Summary
What Hornung et al. (2025) met when using real models, and what they conclude about it.

The funnel: 148 offices contacted, 24 with substantive feedback, 50 IFC files, 22 usable. The other 28 lacked a required
class, were corrupted or failed to parse.

Typical errors: elements modeled in story one but aggregated into story three, and wrong categories, such as IfcColumn
used for façade shading. Modeling habits vary between offices, so they adopted IFC conventions as a baseline and excluded
customizable parameters.

What the conclusion proposes (§5), none of it tested in the paper:
- Vector similarity search or hardcoded dictionaries to resolve the variability in custom properties and names.
- More nuanced filtering: keep selected property sets to preserve design diversity, and exclude only files that truly
  lack essential elements or have technical errors.
- A wider ontology: materials, spatial programs and qualitative attributes.

For the thesis
- Part of the data loss is their own choice: the strict six-class filter causes some of it.
- The author's data lakes usually follow standards and come from the same designer, so this cost may be lower. That has to
  be measured, not assumed.
- Possible experiment (Claude's reading, not in the paper): compare a hardcoded dictionary with vector similarity as the
  name-mapping step of the pipeline.
