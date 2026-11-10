## 2026-11-10 · Summary
Author: an MCP server for Revit assembles everything. What the AI predicts is placed in the Revit model through MCP tool calls.
Claude: today rebuild.py rebuilds the model from the JSON through pyRevit with no AI (412 elements, 0 failures in the last
run). It stays as the control: the same compare.py can measure both the round trip and what the AI-guided assembly builds.
Claude: MCP4IFC is the only case read of an LLM acting on a model through tools. Its geometry looked right, but the walls were
not connected, and the openings, rooms and properties were missing. That is the risk to watch when the AI places elements
one tool call at a time.

For the thesis
- It is step 05 of the pipeline, and it is what makes the generating half of the question happen inside Revit, where
  Hornung and Renner stop at a bounding box in Rhino.
- Open, Claude's questions: which MCP server for Revit (an existing one or an own), which tools it needs (create a wall,
  place a door on its host wall, join), and who proposes each call: the trained model or an LLM that reads its predictions.
