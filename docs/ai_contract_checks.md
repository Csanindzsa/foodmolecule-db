# AI Contract Checks

Status: no-credential release check for prompt, parser, and model-routing drift.

## Command

Run from the repository root:

```bash
python scripts/check_ai_contract.py
```

CI and the local release audit run this command before backend tests.

## What It Verifies

- Every AI task has a dispatcher parser, model-ranking preferences, and a matching prompt template.
- Dispatcher calls request JSON object responses and every prompt requires JSON-only output.
- Pydantic parsers bound study impacts, safety scores, health scores, and molecule harm levels.
- Confidence-bearing outputs use the shared `high` / `medium` / `low` labels.
- Study summaries are capped before persistence.
- Safety adjustments keep the 15-point launch guardrail, cite PMIDs, and write score revisions.

## Live Launch Follow-Up

This check does not call OpenRouter or OpenCode Go. After provider keys are configured, run a small live study-analysis and safety-adjustment batch, confirm quota in the provider dashboard, and review generated summaries before enabling scheduled production runs.
