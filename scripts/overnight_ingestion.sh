#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
LOG_DIR="$ROOT/logs/overnight_ingestion_$RUN_ID"
STATUS_FILE="$ROOT/logs/overnight_ingestion_status.json"
LATEST_FILE="$ROOT/logs/overnight_ingestion_latest"
mkdir -p "$LOG_DIR"
printf '%s\n' "$RUN_ID" > "$LATEST_FILE"

MAIN_LOG="$LOG_DIR/main.log"
exec > >(tee -a "$MAIN_LOG") 2>&1

write_status() {
  local status="$1"
  local step="$2"
  python - "$STATUS_FILE" "$RUN_ID" "$status" "$step" "$LOG_DIR" <<'PY'
import json, sys
from datetime import datetime, timezone
path, run_id, status, step, log_dir = sys.argv[1:]
payload = {
    "run_id": run_id,
    "status": status,
    "step": step,
    "log_dir": log_dir,
    "updated_at": datetime.now(timezone.utc).isoformat(),
}
open(path, "w", encoding="utf-8").write(json.dumps(payload, indent=2))
PY
}

run_step() {
  local name="$1"
  shift
  echo
  echo "===== $(date -u +%Y-%m-%dT%H:%M:%SZ) :: $name ====="
  write_status "running" "$name"
  "$@"
  local code=$?
  if [[ "$code" -ne 0 ]]; then
    echo "ERROR: step '$name' failed with exit code $code"
    write_status "failed" "$name"
    exit "$code"
  fi
}

echo "FoodMolecule-DB overnight ingestion run: $RUN_ID"
echo "Repo: $ROOT"
echo "Logs: $LOG_DIR"
write_status "running" "bootstrap"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "ERROR: .env is missing at $ROOT/.env"
  write_status "failed" "missing .env"
  exit 2
fi

if [[ ! -x backend/.venv/bin/python ]]; then
  run_step "create Python venv" python3 -m venv backend/.venv
fi

PYTHON="$ROOT/backend/.venv/bin/python"
PIP="$ROOT/backend/.venv/bin/pip"
run_step "install/update Python dependencies" "$PIP" install -r backend/requirements.txt

export DJANGO_SETTINGS_MODULE=nutrii.settings
export PYTHONUNBUFFERED=1

run_step "Django system check" "$PYTHON" backend/manage.py check
run_step "Django migrations" "$PYTHON" backend/manage.py migrate --noinput
run_step "capture baseline counts" "$PYTHON" scripts/report_ingestion_counts.py --label before --output "$LOG_DIR/counts_before.json"

USDA_LIMIT="${USDA_LIMIT:-5000}"
USDA_PAGE_SIZE="${USDA_PAGE_SIZE:-200}"
USDA_CANDIDATE_MULTIPLIER="${USDA_CANDIDATE_MULTIPLIER:-2}"
USDA_MAX_PAGES_PER_QUERY="${USDA_MAX_PAGES_PER_QUERY:-10}"
USDA_DETAIL_BATCH_SIZE="${USDA_DETAIL_BATCH_SIZE:-50}"
PUBMED_DAYS="${PUBMED_DAYS:-365}"
PUBMED_MAX_RESULTS="${PUBMED_MAX_RESULTS:-10}"
PUBMED_PASSES="${PUBMED_PASSES:-3}"
STUDY_ANALYZER_LIMIT="${STUDY_ANALYZER_LIMIT:-25}"
MOLECULE_IMAGE_LIMIT="${MOLECULE_IMAGE_LIMIT:-500}"
FOOD_IMAGE_LIMIT="${FOOD_IMAGE_LIMIT:-200}"
FOOD_IMAGE_SLEEP="${FOOD_IMAGE_SLEEP:-5}"

run_step "fetch USDA FoodData Central foods" "$PYTHON" scripts/fetchers/fetch_usda_bulk.py \
  --limit "$USDA_LIMIT" \
  --page-size "$USDA_PAGE_SIZE" \
  --candidate-multiplier "$USDA_CANDIDATE_MULTIPLIER" \
  --max-pages-per-query "$USDA_MAX_PAGES_PER_QUERY" \
  --detail-batch-size "$USDA_DETAIL_BATCH_SIZE" \
  --output data/seed/foods

run_step "validate food seed data dry-run" "$PYTHON" scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules \
  --dry-run

run_step "insert/update food seed data" "$PYTHON" scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules

run_step "capture post-food counts" "$PYTHON" scripts/report_ingestion_counts.py --label post-foods --output "$LOG_DIR/counts_post_foods.json"

for pass in $(seq 1 "$PUBMED_PASSES"); do
  run_step "PubMed ingestion pass $pass/$PUBMED_PASSES" "$PYTHON" scripts/pubmed_watcher.py \
    --days "$PUBMED_DAYS" \
    --max-results "$PUBMED_MAX_RESULTS"
done

run_step "capture post-PubMed counts" "$PYTHON" scripts/report_ingestion_counts.py --label post-pubmed --output "$LOG_DIR/counts_post_pubmed.json"

if [[ -n "${OPENROUTER_API_KEY:-}${OPENROUTER_API_KEYS:-}${OPENCODE_GO_API_KEY:-}${OPENCODE_GO_API_KEYS:-}" ]]; then
  run_step "AI study analysis" "$PYTHON" scripts/study_analyzer.py --limit "$STUDY_ANALYZER_LIMIT"
  run_step "AI safety adjustment" "$PYTHON" scripts/safety_adjuster.py --auto
else
  echo "Skipping AI study analysis/safety adjustment because no AI provider key is set. Set OPENROUTER_API_KEY(S) or OPENCODE_GO_API_KEY(S)."
fi

run_step "molecule image enrichment" "$PYTHON" scripts/fetch_images.py \
  --entity molecule \
  --limit "$MOLECULE_IMAGE_LIMIT"

run_step "food image enrichment via Brave" "$PYTHON" scripts/fetch_images.py \
  --entity food \
  --limit "$FOOD_IMAGE_LIMIT" \
  --sleep "$FOOD_IMAGE_SLEEP"

run_step "final counts" "$PYTHON" scripts/report_ingestion_counts.py \
  --label final \
  --before "$LOG_DIR/counts_before.json" \
  --output "$LOG_DIR/counts_final.json" \
  --markdown

write_status "completed" "done"
echo "Overnight ingestion completed successfully."
