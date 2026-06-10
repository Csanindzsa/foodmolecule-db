# Research Operations Checks

Status: static PubMed and AI pipeline preflight. This validates repository wiring for research ingestion and safety adjustment without requiring NCBI, OpenRouter, cron, or production database credentials.

## Command

Run from the repository root:

```bash
python scripts/check_research_ops.py
```

CI runs the same command.

## What It Verifies

- `scripts/overnight_ingestion.sh` and `scripts/continue_overnight_ingestion.sh` default to three PubMed passes over a 365-day lookback with 10 results per query.
- Both runners call `scripts/pubmed_watcher.py` with configured days/results.
- Both runners gate AI analysis and safety adjustment on OpenRouter or OpenCode Go provider keys.
- `scripts/study_analyzer.py --limit 25` runs before `scripts/safety_adjuster.py --auto`.
- Post-PubMed counts are captured for launch reporting.
- PubMed watcher code links food-originated studies through `FoodStudy`.
- Study analysis routes through `OpenRouterDispatcher`.
- Safety adjustment enforces the 15-point cap and writes `SafetyScoreRevision` records.
- The overnight runbook documents the 6-hour cron cadence and `tmux` handoff.

## What It Does Not Prove

- The production cron job is installed and running every 6 hours.
- NCBI or OpenRouter credentials are valid.
- OpenRouter has sufficient launch quota.
- A full safety adjustment cycle has completed against production data.

After this static check passes, verify the scheduler and provider dashboards in production, then capture before/after ingestion counts from `scripts/report_ingestion_counts.py`.
