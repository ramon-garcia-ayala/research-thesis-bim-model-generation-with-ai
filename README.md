# Research thesis: BIM model generation with AI

**Question.** Can an AI learn to decompose BIM models into meaningful parts and use them to generate new, valid models?

**Hypothesis.** If a BIM model is decomposed into its elements and relations, an AI can find the patterns it needs to
understand how to build something similar.

## Folders

- [`research-map/`](research-map/): the research itself and the app that holds it: the map, the paper reader, the
  papers, their notes, the literature research and the presentations. Run its commands from inside that folder.
- [`pipeline/`](pipeline/): the code that decomposes a BIM model and rebuilds it, and the comparison between the two.

## On a new computer

```sh
git clone https://github.com/ramon-garcia-ayala/research-thesis-bim-model-generation-with-ai.git
cd research-thesis-bim-model-generation-with-ai/research-map
npm install
npm run dev            # http://localhost:4322/
```

The map and the reader need Node. The rest depends on what you use:

- **The reader's chat and preparing papers:** Claude Code, signed in (`claude`), and Python with `pip install pymupdf`.
- **The pipeline:** Revit 2027 and pyRevit, on Windows. See [`pipeline/README.md`](pipeline/README.md).
