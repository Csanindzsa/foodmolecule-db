# Overnight Ingestion Runbook

This is the handoff for running the long data jobs on a quieter machine or with a Hermes-style agent. The goal is:

1. Generate a larger USDA food seed set.
2. Insert/update the backend database.
3. Run PubMed study ingestion.
4. Run image enrichment in parallel where it is safe.
5. Optionally run AI study analysis and safety adjustment after studies exist.

Do not commit `.env`, API keys, or Supabase service-role secrets.

## 1. Clone And Install

```bash
git clone <repo-url> foodmolecule-db
cd foodmolecule-db
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

Fish shell:

```fish
source backend/.venv/bin/activate.fish
```

If the frontend also needs to be checked:

```bash
cd Nutri/react-ts-frontend
npm install
npm run build
cd ../..
```

## 2. Environment

Create `.env` in the repo root:

```bash
cp .env.example .env
```

Required for database and API work:

```env
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_PASSWORD=...

USDA_API_KEY=...
NCBI_API_KEY=...
NCBI_EMAIL=your@email.com
BRAVE_API_KEY=...
SUPABASE_IMAGE_BUCKET=food-images
```

Optional, only needed for AI summaries and score updates:

```env
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## 3. Supabase Storage Bucket

A bucket is a named Supabase Storage container for files. Nutrii uses it to store compressed `.webp` food and molecule images.

Create it in Supabase:

1. Open Supabase Dashboard.
2. Select the Nutrii project.
3. Go to **Storage**.
4. Click **New bucket**.
5. Name it exactly `food-images`.
6. Set it to **Public**.
7. Create the bucket.

Keep `SUPABASE_SERVICE_ROLE_KEY` only in `.env` on backend/agent machines. Never expose it in frontend code.

## 4. Smoke Checks

Run these before the overnight work:

```bash
source backend/.venv/bin/activate
python backend/manage.py check
python backend/manage.py migrate
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run
```

Check current live DB counts:

```bash
python backend/manage.py shell -c "from core.models import Food, Molecule, FoodMolecule, Study; print({'foods': Food.objects.count(), 'molecules': Molecule.objects.count(), 'links': FoodMolecule.objects.count(), 'studies': Study.objects.count()})"
```

## 5. USDA Gathering

Start with a medium run before 2000:

```bash
mkdir -p logs
python scripts/fetchers/fetch_usda_bulk.py \
  --limit 500 \
  --page-size 200 \
  --candidate-multiplier 3 \
  --output data/seed/foods \
  2>&1 | tee logs/usda_fetch_500.log
```

Validate:

```bash
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run \
  2>&1 | tee logs/pipeline_dry_run.log
```

Insert/update the database:

```bash
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules \
  2>&1 | tee logs/pipeline_insert.log
```

Then check counts:

```bash
python backend/manage.py shell -c "from core.models import Food, Molecule, FoodMolecule; print({'foods': Food.objects.count(), 'molecules': Molecule.objects.count(), 'links': FoodMolecule.objects.count()})"
```

If the 500 run looks good, run a larger one:

```bash
python scripts/fetchers/fetch_usda_bulk.py \
  --limit 2000 \
  --page-size 200 \
  --candidate-multiplier 3 \
  --output data/seed/foods \
  2>&1 | tee logs/usda_fetch_2000.log

python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules \
  2>&1 | tee logs/pipeline_insert_2000.log
```

USDA `404` detail records are expected sometimes. The fetcher skips them and over-collects candidates so the final written count can still reach the requested limit where possible.

## 6. Parallel Overnight Jobs

Only start these after the USDA data has been inserted into the database.

Recommended terminal layout with `tmux`:

```bash
tmux new -s nutrii-ingest
```

Pane 1: PubMed watcher:

```bash
source backend/.venv/bin/activate
mkdir -p logs
while true; do
  date
  python scripts/pubmed_watcher.py --days 365 --max-results 10
  sleep 900
done 2>&1 | tee -a logs/pubmed_watcher.log
```

Pane 2: molecule images. This is the safest image job because it uses PubChem structure images when `pubchem_cid` exists:

```bash
source backend/.venv/bin/activate
python scripts/fetch_images.py --entity molecule --limit 500 \
  2>&1 | tee logs/images_molecules.log
```

Pane 3: food images. Run slowly because Brave rate-limits and food photo matching is noisier:

```bash
source backend/.venv/bin/activate
python scripts/fetch_images.py --entity food --limit 200 --sleep 5 \
  2>&1 | tee logs/images_foods.log
```

Pane 4: periodic count checks:

```bash
source backend/.venv/bin/activate
while true; do
  date
  python backend/manage.py shell -c "from core.models import Food, Molecule, FoodMolecule, Study; print({'foods': Food.objects.count(), 'molecules': Molecule.objects.count(), 'links': FoodMolecule.objects.count(), 'studies': Study.objects.count()})"
  sleep 1800
done 2>&1 | tee -a logs/counts.log
```

Detach from tmux:

```text
Ctrl-b d
```

Reattach:

```bash
tmux attach -t nutrii-ingest
```

## 7. AI Analysis And Score Updates

Run this only if `OPENROUTER_API_KEY` is set and there are studies in the DB.

Small test:

```bash
python scripts/study_analyzer.py --limit 5 2>&1 | tee logs/study_analyzer_test.log
python scripts/safety_adjuster.py --auto 2>&1 | tee logs/safety_adjuster_test.log
```

Overnight loop:

```bash
while true; do
  date
  python scripts/study_analyzer.py --limit 25
  python scripts/safety_adjuster.py --auto
  sleep 1800
done 2>&1 | tee -a logs/ai_analysis.log
```

## 8. Expected Warnings

These are not automatically fatal:

- USDA `404`: search returned an FDC ID whose detail endpoint did not resolve. The fetcher skips it.
- Brave `429`: Brave rate limit. Increase `--sleep` or run fewer food images.
- `missing PubChem CID`: molecule has no `pubchem_cid`, so the image script cannot use PubChem for that molecule.
- `no approved candidate`: Brave results were rejected by source or prepared-dish filters.

These are blockers:

- `OperationalError` connecting to Supabase: check `SUPABASE_URL`, `SUPABASE_DB_PASSWORD`, network/DNS.
- `SUPABASE_SERVICE_ROLE_KEY is required`: needed for image upload.
- `BRAVE_API_KEY is required`: needed for food image search.
- Pipeline validation failed: do not insert until the dry-run passes.

## 9. Final Health Check

After the overnight run:

```bash
python backend/manage.py shell -c "from core.models import Food, Molecule, FoodMolecule, Study; print({'foods': Food.objects.count(), 'molecules': Molecule.objects.count(), 'links': FoodMolecule.objects.count(), 'studies': Study.objects.count()})"
python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run
python backend/manage.py check
```

If the frontend is on that machine:

```bash
cd Nutri/react-ts-frontend
npm run build
```

## 10. Important Git Note

Generated seed JSON files under `data/seed/foods` can become large. Decide before committing whether the repo should store generated seed data or whether the quiet PC should regenerate it from USDA.

For handoff between machines, the important files to commit are:

- `scripts/fetchers/fetch_usda_bulk.py`
- `scripts/fetchers/fetch_usda.py`
- `scripts/fetch_images.py`
- `backend/requirements.txt`
- `schema/food.schema.json`
- `.env.example`
- this runbook

Do not commit `.env`.
