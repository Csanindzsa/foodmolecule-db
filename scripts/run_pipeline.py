"""
nutrii — Master Pipeline Runner

Orchestrates the full data ingestion pipeline:
1. Fetch raw data from sources
2. Normalize & deduplicate
3. Validate against schemas
4. Bulk insert into database

Usage:
    python scripts/run_pipeline.py --foods data/seed/foods --molecules data/seed/molecules --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.loaders.validate import validate_batch
from scripts.loaders.bulk_insert import load_json_entries, upsert_food, upsert_molecule, link_food_molecules
from scripts.pipeline.models import FoodEntry, MoleculeEntry
from scripts.transformers.deduplicator import deduplicate_all
from scripts.transformers.normalizer import normalize_all


def run_pipeline(
    foods_dir: Path | None = None,
    molecules_dir: Path | None = None,
    dry_run: bool = False,
) -> dict:
    """Run the full ingestion pipeline."""

    # ─── Load ───────────────────────────────────────────────────────────────
    foods = load_json_entries(foods_dir, FoodEntry) if foods_dir else []
    molecules = load_json_entries(molecules_dir, MoleculeEntry) if molecules_dir else []

    print(f"[1/5] Loaded {len(foods)} food(s), {len(molecules)} molecule(s)")

    # ─── Normalize ──────────────────────────────────────────────────────────
    foods, molecules = normalize_all(foods, molecules)
    print(f"[2/5] Normalized names and units")

    # ─── Deduplicate ────────────────────────────────────────────────────────
    foods, molecules = deduplicate_all(foods, molecules)
    print(f"[3/5] Deduplicated to {len(foods)} food(s), {len(molecules)} molecule(s)")

    # ─── Validate ───────────────────────────────────────────────────────────
    errors = validate_batch(foods, molecules)
    if errors:
        print(f"[4/5] VALIDATION FAILED — {len(errors)} error(s):")
        for eid, errs in list(errors.items())[:5]:
            print(f"  {eid}: {errs[0]}")
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more")
        return {"status": "failed", "errors": errors}

    print(f"[4/5] Validation passed")

    # ─── Insert ─────────────────────────────────────────────────────────────
    if dry_run:
        print("[5/5] DRY RUN — skipping database insert")
        return {"status": "dry_run", "foods": len(foods), "molecules": len(molecules)}

    for mol in molecules:
        upsert_molecule(mol)
    print(f"[5/5] Inserted {len(molecules)} molecule(s)")

    for food in foods:
        obj = upsert_food(food)
        link_food_molecules(obj, food.molecules)
    print(f"[5/5] Inserted {len(foods)} food(s)")

    return {"status": "success", "foods": len(foods), "molecules": len(molecules)}


def main():
    parser = argparse.ArgumentParser(description="Run the nutrii data ingestion pipeline")
    parser.add_argument("--foods", type=Path, help="Directory with food JSON files")
    parser.add_argument("--molecules", type=Path, help="Directory with molecule JSON files")
    parser.add_argument("--dry-run", action="store_true", help="Validate without inserting")
    args = parser.parse_args()

    result = run_pipeline(
        foods_dir=args.foods,
        molecules_dir=args.molecules,
        dry_run=args.dry_run,
    )

    if result["status"] == "failed":
        sys.exit(1)

    print("Pipeline complete.")


if __name__ == "__main__":
    main()
