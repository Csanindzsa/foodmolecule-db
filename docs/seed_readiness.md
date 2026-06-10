# Seed Readiness Check

Status: local data preflight. This verifies the repository seed files are schema-valid and large enough for the launch baseline before loading them into staging or production.

## Command

Run from the repository root:

```bash
python scripts/check_seed_readiness.py --min-foods 100 --min-molecules 4
```

The default seed directory is `data/seed`. Use `--seed-dir` to point at another seed set.

## What It Verifies

- `data/seed/foods/**/*.json` exists and validates against `schema/food.schema.json`.
- `data/seed/molecules/**/*.json` exists and validates against `schema/molecule.schema.json`.
- The food seed count is at least the launch baseline, currently 100.
- The molecule seed count is at least the current MVP molecule baseline, currently 4.
- A category count is reported so launch notes can record how broad the seed set is.

CI runs the same preflight, plus standalone food and molecule schema validation.

CI also dry-runs the ingestion pipeline against the real seed set:

```bash
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run
```

That catches data that passes JSON Schema but cannot be loaded, normalized, deduplicated, or validated by the pipeline models.

## What It Does Not Prove

- The production database has been seeded.
- The top 100 launch foods are product-approved or final.
- PubMed citations, AI summaries, safety adjustments, or ban-list regulatory verification are complete.
- Food and molecule images are present in Supabase Storage.

After this passes, run the database load against the target environment, then run deployed API smoke and query-plan checks.
