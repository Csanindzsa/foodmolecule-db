"""
nutrii — Study Analyzer

Reads unanalyzed studies from the database, sends them to OpenRouter for
AI analysis, and stores the structured results back in the database.

Usage:
    python scripts/study_analyzer.py --limit 10
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from django.db import transaction

from ai.dispatcher import OpenRouterDispatcher
from core.models import Food, Molecule, Study


def find_relevant_ingredient(study: Study) -> Food | Molecule | None:
    """Best-effort fuzzy match of study title/abstract to known ingredients."""
    text = f"{study.title} {study.abstract}".lower()

    # Try foods first
    for food in Food.objects.all():
        names = {food.name} | set(food.aliases)
        if any(n in text for n in names if n):
            return food

    # Then molecules
    for mol in Molecule.objects.all():
        if mol.name in text:
            return mol

    return None


def analyze_study(study: Study) -> bool:
    """Send a study to OpenRouter and update its AI fields."""
    ingredient = find_relevant_ingredient(study)
    ingredient_name = ingredient.name if ingredient else "unknown"
    known_molecules = []
    if isinstance(ingredient, Food):
        known_molecules = [fm.molecule.name for fm in ingredient.foodmolecule_set.select_related("molecule").all()]

    dispatcher = OpenRouterDispatcher()
    try:
        result = dispatcher.dispatch(
            "study_analysis",
            template_vars={
                "ingredient_name": ingredient_name,
                "known_molecules": known_molecules,
                "current_safety_score": getattr(ingredient, "overall_safety_score", None) or 50,
                "current_health_index": getattr(ingredient, "health_index", None) or 50,
                "study_title": study.title,
                "study_abstract": study.abstract or "",
                "journal": study.journal,
                "year": study.publication_year,
            },
        )
    except Exception as exc:
        print(f"  OpenRouter failed for PMID {study.pmid}: {exc}")
        return False

    with transaction.atomic():
        study.ai_summary = result.summary
        study.ai_safety_impact = result.safety_impact
        study.ai_health_impact = result.health_impact
        study.ai_confidence = result.confidence
        study.ai_model_used = dispatcher.selector.pick_best_model("study_analysis")
        study.analyzed_at = datetime.utcnow()
        study.save()

    print(f"  Analyzed PMID {study.pmid}: safety={result.safety_impact}, health={result.health_impact}, confidence={result.confidence}")
    return True


def run_analyzer(limit: int | None = None) -> dict:
    """Analyze all unanalyzed studies."""
    qs = Study.objects.filter(ai_summary="", abstract__isnull=False).exclude(abstract="")
    if limit:
        qs = qs[:limit]

    success = 0
    failed = 0
    for study in qs:
        if analyze_study(study):
            success += 1
        else:
            failed += 1

    return {"success": success, "failed": failed}


def main():
    parser = argparse.ArgumentParser(description="Analyze unanalyzed PubMed studies via AI")
    parser.add_argument("--limit", type=int, help="Max studies to analyze in this run")
    args = parser.parse_args()

    print(f"[{datetime.utcnow().isoformat()}] Study analyzer starting")
    result = run_analyzer(limit=args.limit)
    print(f"[{datetime.utcnow().isoformat()}] Success: {result['success']}, Failed: {result['failed']}")


if __name__ == "__main__":
    main()
