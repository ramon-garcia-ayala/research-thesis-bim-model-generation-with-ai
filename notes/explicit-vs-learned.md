## 2026-10-18 · Summary
Can AI validate for production without explicit rules? Code is legal and needs a trace: which article fails
and why. A learned model can say "this looks wrong" but not cite the article.

Three ways AI "judgment" is formed:
- Learned from examples (approved / rejected plans): needs training and data; generated datasets feed it.
- General LLM + the code text (RAG): no training, but it can invent and is not deterministic.
- LLM that writes rules (scripts that check the model): no training; its judgment becomes an auditable rule.

Learned judgment is the statistical bias of its data; a senior's criterion is also bias of experience, but the
senior explains and answers for it. Likely future: AI writes the rules and judges the fuzzy part; rules give the
auditable verdict. The limit of "production" moves as AI turns judgment into rules.
