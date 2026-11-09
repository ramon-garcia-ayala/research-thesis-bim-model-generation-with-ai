## 2026-11-08 · Summary
A benchmark and a fine-tuned LLM for reading Revit data as text. Revit models of five building types (shopping malls, offices,
dormitories, teaching buildings, museums) are cut into spatial blocks of 5 m or 8 m with 10-15 components each: 150 blocks.
Each block becomes semi-structured text: a Header Section describing the model, a Component Header Section naming the
attributes and units of a category, and a Component Data Section with one natural-language sentence per element (ID, start and
end coordinates, thickness, height, length, construction number). Slabs are given as ordered corner points. Defects are injected
into the text, 22 question templates are asked of each block, and answers come from hard-coded rules: 3,300 QA pairs. Eleven
general LLMs are scored; then Qwen2.5-14B-instruct is tuned with LoRA on 3,493 pairs (2,129 QA and 1,364 with reasoning, QRA).

Results
- General LLMs handle extraction and statistics, and fail more on calculation, floor-height reasoning and the review and
  detailing tasks (G-Eval generally below 0.8 for the two models compared).
- Overall G-Eval 0.689 to 0.834 after tuning, which the paper reports as a 21.0% increase: general tasks 0.810 to 0.874,
  domain-specific 0.588 to 0.801. Format score +5.3%.
- The best mix was 100% QRA (1,364 samples), with format accuracy 90.2%. The authors read it as quality over quantity.
- By question type: better on 13 (mean gain 0.28), slightly worse on 8 (mean loss 0.06), mostly extraction, statistics and
  calculation.

For the thesis
- A concrete text format for a Revit model, an alternative to the graph of Hornung et al.: elements as sentences, with no
  relations as edges. The examples show only walls, beams and slabs.
- It reads and corrects; it does not generate. Output is text: the paper writes no Revit or IFC and measures no validity.
- Its parts are spatial blocks, not meaningful parts. The 3D calculation questions were dropped after early tests failed.
- Calculation and floor-height reasoning were the weak spots: a warning if an LLM must write coordinates.
- Real models are inspected and fixed first, then defects are injected, since real defective data is scarce (clean-real-models,
  real-or-synthetic-data). The number of Revit models behind the 150 blocks is not stated.

Doubts from reading it (Claude's, not the paper's)
- G-Eval is judged by GLM-4-plus, one of the four models whose answers, kept when G-Eval was 0.8 or higher, became the tuning
  data. The same judge picks the training data and scores the result.
- Test and tuning data are both partitions of the same BIM-QA dataset, with the same 22 templates. No split by project is
  mentioned, so the gain may be partly the templates' format.
- The text says Qwen-BIM beats the 32B and 72B models. In Fig. 19, G-Eval is 0.83 against 0.83 (32B), and its ROUGE-L is below
  both of theirs.
- Table captions are misnumbered (Table 1 and Table 3 twice each), and the text cites Table 6 for the tuning groups. The data
  is available "on request".
