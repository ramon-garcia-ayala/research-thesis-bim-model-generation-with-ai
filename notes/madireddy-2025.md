## 2026-10-18 · Summary
An LLM reads one code rule (12 IRC/IMC rules: doors, stairs, guards, ceiling height, WWR, room area,
fixtures, ventilation…) and writes an IronPython script run in Revit 2024 (RevitPythonShell); errors go back
to the LLM until the script runs; a final call writes a report. Prompt: persona + rule text + general
instructions + rule-specific hints naming Revit categories (OST_StairsRailing…). Tested on one house, one office.

Results: only "fixes needed until the script runs", rules 1–5. Grok best (0.6 fixes), then Deepseek, Claude
Sonnet 3.5, ChatGPT 4.0; Llama 3.1 and Copilot never produced a working script. Not measured: whether the
verdicts are right (no ground truth), or time saved. The conclusions name ChatGPT and Claude "most effective",
against their own table.

For the thesis
- The hints exist "because objects in a BIM model are defined differently by various users" (p.10); the model
  "must be well-developed with accurate room tags, names, and boundaries" (p.13): the rule is easy, the
  information is the hard part.
- Real models "often contain incomplete, inconsistent, or outdated information" (p.18): standards do not hold.
- Needs "manual intervention for script execution within Revit, as well as for correcting any errors" (p.18).
- Next step proposed: an LLM agent on the Revit API (level 3, but without a pure engine in between).
- A script that runs is not a check that is right: an argument for tested rule engines a person signs.
