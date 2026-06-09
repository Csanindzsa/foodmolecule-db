"""
nutrii — Ingestion Count Reporter

Prints machine-readable and human-readable database counts for overnight runs.
Used by scripts/overnight_ingestion.sh and the Hermes cron reporter.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from core.models import (  # noqa: E402
    Food,
    FoodMolecule,
    FoodStudy,
    IngredientAIGuide,
    Molecule,
    SafetyScoreRevision,
    Study,
)


def collect_counts() -> dict[str, int | str]:
    return {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "foods": Food.objects.count(),
        "foods_with_images": Food.objects.exclude(image_url="").count(),
        "molecules": Molecule.objects.count(),
        "molecules_with_images": Molecule.objects.exclude(structure_image_url="").count(),
        "food_molecule_links": FoodMolecule.objects.count(),
        "studies": Study.objects.count(),
        "studies_with_abstracts": Study.objects.exclude(abstract="").count(),
        "studies_analyzed": Study.objects.filter(ai_summary__isnull=False).exclude(ai_summary="").count(),
        "scientific_paper_food_links": FoodStudy.objects.count(),
        "ingredient_ai_guides": IngredientAIGuide.objects.count(),
        "safety_revisions": SafetyScoreRevision.objects.count(),
    }


def diff_counts(before: dict, after: dict) -> dict[str, int]:
    diff: dict[str, int] = {}
    for key, value in after.items():
        if isinstance(value, int) and isinstance(before.get(key), int):
            diff[key] = value - before[key]
    return diff


def main() -> None:
    parser = argparse.ArgumentParser(description="Report nutrii ingestion DB counts")
    parser.add_argument("--label", default="current")
    parser.add_argument("--output", type=Path, help="Write counts JSON to this path")
    parser.add_argument("--before", type=Path, help="Optional baseline JSON for delta output")
    parser.add_argument("--markdown", action="store_true", help="Print Telegram-friendly markdown")
    args = parser.parse_args()

    counts = collect_counts()
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(counts, indent=2), encoding="utf-8")

    before = None
    deltas = None
    if args.before and args.before.exists():
        before = json.loads(args.before.read_text(encoding="utf-8"))
        deltas = diff_counts(before, counts)

    if args.markdown:
        print(f"## FoodMolecule-DB ingestion report — {args.label}")
        print(f"Captured: `{counts['captured_at']}`")
        if deltas:
            print("\nDeltas since run start:")
            for key in sorted(deltas):
                print(f"- {key}: {deltas[key]:+d}")
        print("\nCurrent totals:")
        for key, value in counts.items():
            if key != "captured_at":
                print(f"- {key}: {value}")
    else:
        payload = {"label": args.label, "counts": counts}
        if before is not None:
            payload["before"] = before
        if deltas is not None:
            payload["deltas"] = deltas
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
