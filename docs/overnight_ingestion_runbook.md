# FoodMolecule-DB Overnight Ingestion Runbook

This document is the operational plan for running the Nutrii / FoodMolecule-DB data injection overnight on this Mac.

The `.env` file is expected to already exist in the repository root. Do **not** commit `.env`, Supabase service-role keys, API keys, or generated logs.

## Goal

Run the ingestion in the safest order:

1. Verify environment and database connectivity.
2. Fetch food records from USDA FoodData Central.
3. Validate generated food seed JSON.
4. Insert/update food and molecule records in Supabase/Postgres.
5. Ingest and link scientific papers from PubMed.
6. Optionally analyze studies and update safety scores if OpenRouter is configured.
7. Fetch/upload molecule structure images.
8. Fetch/upload food images via Brave image search.
9. Report how many records were added/enriched.

## Existing local setup

Repository:

```bash
/Users/hatsunemiku/Documents/GitHub/foodmolecule-db
```

Required local files/tools:

- `.env` in the repo root — already transferred by the user.
- Python virtualenv at `backend/.venv` — the overnight script creates it if missing.
- `ffmpeg` — required by image compression.
- `tmux` — used so the ingestion can keep running outside the Hermes cron tick.

The script intentionally does **not** tell the operator to create Supabase buckets. The user has already handled Supabase/environment setup for this Mac.

## Required environment keys

The script checks/uses these from `.env` without printing their values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD` or `DATABASE_URL`
- `USDA_API_KEY`
- `NCBI_EMAIL`
- `NCBI_API_KEY`
- `BRAVE_API_KEY`
- `SUPABASE_IMAGE_BUCKET`, normally `food-images`
- `OPENROUTER_API_KEY` / `OPENROUTER_API_KEYS`, optional for AI study summaries and safety adjustments
- `OPENCODE_GO_API_KEY` / `OPENCODE_GO_API_KEYS`, optional fallback AI keys
- `OPENCODE_GO_MODEL`, optional fallback model override; defaults to `deepseek/deepseek-v4-flash`

## Main runner

Use the repo script:

```bash
cd /Users/hatsunemiku/Documents/GitHub/foodmolecule-db
./scripts/overnight_ingestion.sh
```

The runner writes logs to:

```bash
logs/overnight_ingestion_<RUN_ID>/
```

It also writes:

```bash
logs/overnight_ingestion_latest
logs/overnight_ingestion_status.json
```

## Ordered plan

### 1. Bootstrap and smoke checks

The runner:

```bash
pip install -r backend/requirements.txt
python backend/manage.py check
python backend/manage.py migrate --noinput
python scripts/report_ingestion_counts.py --label before --output logs/.../counts_before.json
```

If any of these fail, stop and fix the environment/database before continuing.

### 2. USDA FoodData Central ingestion

Default command inside the runner:

```bash
python scripts/fetchers/fetch_usda_bulk.py \
  --limit 5000 \
  --page-size 200 \
  --candidate-multiplier 2 \
  --max-pages-per-query 10 \
  --detail-batch-size 50 \
  --output data/seed/foods
```

Expected warning:

- USDA detail `404`/skips are not automatically fatal; the fetcher over-collects candidates.

### 3. Validate before database write

```bash
python scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules \
  --dry-run
```

If validation fails, do not insert.

### 4. Insert/update database

```bash
python scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules
```

This upserts foods, molecules/stub nutrients, and food–molecule links.

### 5. PubMed scientific-paper ingestion and linking

The runner performs three PubMed passes after foods exist:

```bash
python scripts/pubmed_watcher.py --days 365 --max-results 10
```

The PubMed watcher preserves the food that produced each query, so new studies are linked through `FoodStudy` when they came from a food query.

Metrics to report:

- `studies`
- `studies_with_abstracts`
- `scientific_paper_food_links`

### 6. Optional AI analysis

If any of `OPENROUTER_API_KEY`, `OPENROUTER_API_KEYS`, `OPENCODE_GO_API_KEY`, or `OPENCODE_GO_API_KEYS` is set:

```bash
python scripts/study_analyzer.py --limit 25
python scripts/safety_adjuster.py --auto
```

Metrics to report:

- `studies_analyzed`
- `safety_revisions`

### 7. Molecule images

Molecule images run before food photos because PubChem structure URLs are more deterministic than web image search:

```bash
python scripts/fetch_images.py --entity molecule --limit 500
```

Metric to report:

- `molecules_with_images`

### 8. Food images via Brave

Food images run slowly because Brave can rate-limit and food photo matching is noisier:

```bash
python scripts/fetch_images.py --entity food --limit 200 --sleep 5
```

Metric to report:

- `foods_with_images`

Expected warnings:

- Brave `429`: rate limit; increase `--sleep` or lower `FOOD_IMAGE_LIMIT`.
- `no approved candidate`: all candidate images were rejected by source/prepared-dish filters.

## Runtime knobs

Override defaults per run by exporting environment variables before launching:

```bash
export USDA_LIMIT=5000
export USDA_CANDIDATE_MULTIPLIER=2
export USDA_MAX_PAGES_PER_QUERY=10
export USDA_DETAIL_BATCH_SIZE=50
export PUBMED_PASSES=3
export PUBMED_DAYS=365
export PUBMED_MAX_RESULTS=10
export STUDY_ANALYZER_LIMIT=25
export MOLECULE_IMAGE_LIMIT=500
export FOOD_IMAGE_LIMIT=200
export FOOD_IMAGE_SLEEP=5
./scripts/overnight_ingestion.sh
```

For a smaller smoke run:

```bash
USDA_LIMIT=100 PUBMED_PASSES=1 MOLECULE_IMAGE_LIMIT=25 FOOD_IMAGE_LIMIT=25 ./scripts/overnight_ingestion.sh
```

## Hermes cron setup

Hermes cron should not directly run the full ingestion in-process because cron agent turns are short. Instead, cron starts a `tmux` session and exits quickly. The long job continues inside `tmux`.

Start script:

```bash
~/.hermes/scripts/start_foodmolecule_overnight.sh
```

Report script:

```bash
~/.hermes/scripts/report_foodmolecule_overnight.sh
```

The reporter should stay silent while the tmux session is still running, then send one final report after completion with deltas from `counts_before.json` to `counts_final.json`.

## Manual monitoring

Check tmux:

```bash
tmux has-session -t foodmolecule-overnight && tmux capture-pane -t foodmolecule-overnight -p | tail -80
```

Attach:

```bash
tmux attach -t foodmolecule-overnight
```

Check latest logs:

```bash
cd /Users/hatsunemiku/Documents/GitHub/foodmolecule-db
RUN_ID=$(cat logs/overnight_ingestion_latest)
tail -100 logs/overnight_ingestion_${RUN_ID}/main.log
cat logs/overnight_ingestion_status.json
```

Generate current report:

```bash
source backend/.venv/bin/activate
python scripts/report_ingestion_counts.py --label current --markdown
```

## Final report requirements

When the run finishes, report at least:

- Foods total and delta.
- Foods with images total and delta.
- Molecules total and delta.
- Molecules with images total and delta.
- Food–molecule links total and delta.
- Scientific papers/studies total and delta.
- PubMed food-study links total and delta.
- Studies analyzed total and delta.
- Safety revisions total and delta.
- Log directory path.
- Any fatal step from `overnight_ingestion_status.json` if the run failed.
