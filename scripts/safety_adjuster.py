"""
nutrii — Safety Adjuster

When a study with |ai_safety_impact| >= 2 is linked to a food,
this agent proposes updated safety and health index scores.

It enforces a ±15 point cap per update and writes a full audit trail.

Usage:
    python scripts/safety_adjuster.py --food-id <uuid> --study-id <uuid>
    python scripts/safety_adjuster.py --auto  # process all pending adjustments
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
from core.models import Food, IngredientAIGuide, SafetyScoreRevision, Study

MAX_DELTA = 15


def get_guide(food: Food) -> str:
    """Fetch the latest agent instruction guide for a food."""
    guide = food.ai_guides.first()
    if guide:
        return guide.guide_markdown
    return "No specific guide exists. Use general toxicology principles."


def get_recent_studies(food: Food, n: int = 5) -> list[Study]:
    """Get the last N analyzed studies linked to this food."""
    return list(
        Study.objects.filter(foodstudy__food=food, ai_summary__isnull=False)
        .exclude(ai_summary="")
        .order_by("-analyzed_at")[:n]
    )


def propose_adjustment(food: Food, triggering_study: Study) -> SafetyScoreRevision | None:
    """Use OpenRouter to propose a new safety score. Returns a revision object (unsaved)."""
    guide = get_guide(food)
    recent = get_recent_studies(food)
    recent_study_data = [
        {"pmid": s.pmid, "ai_summary": s.ai_summary or ""}
        for s in recent
    ]

    dispatcher = OpenRouterDispatcher()
    try:
        result = dispatcher.dispatch(
            "safety_adjustment",
            template_vars={
                "agent_guide_markdown": guide,
                "current_safety_score": food.overall_safety_score or 50,
                "current_health_index": food.health_index or 50,
                "current_harm_level": 0,  # Could compute from molecules
                "study_summary": triggering_study.ai_summary or triggering_study.abstract or "",
                "recent_studies": recent_study_data,
            },
        )
    except Exception as exc:
        print(f"  OpenRouter adjustment failed for {food.name}: {exc}")
        return None

    old_safety = food.overall_safety_score or 50
    old_health = food.health_index or 50

    # Enforce delta cap
    new_safety = max(0, min(100, result.new_safety_score))
    new_health = max(0, min(100, result.new_health_index))

    if abs(new_safety - old_safety) > MAX_DELTA:
        new_safety = old_safety + (MAX_DELTA if new_safety > old_safety else -MAX_DELTA)
    if abs(new_health - old_health) > MAX_DELTA:
        new_health = old_health + (MAX_DELTA if new_health > old_health else -MAX_DELTA)

    revision = SafetyScoreRevision(
        food=food,
        old_safety_score=old_safety,
        new_safety_score=new_safety,
        old_health_index=old_health,
        new_health_index=new_health,
        reason=result.reasoning,
        triggering_study=triggering_study,
        ai_model_used=dispatcher.selector.pick_best_model("safety_adjustment"),
    )
    return revision


def apply_revision(revision: SafetyScoreRevision) -> None:
    """Save the revision and update the food's scores."""
    with transaction.atomic():
        revision.save()
        food = revision.food
        food.overall_safety_score = revision.new_safety_score
        food.health_index = revision.new_health_index
        food.last_analyzed_at = datetime.utcnow()
        food.save()


def run_auto_adjustment() -> dict:
    """Find all foods with high-impact unprocessed studies and adjust scores."""
    from django.db.models import Q

    # Find studies with |impact| >= 2 that have not yet triggered a revision
    studies = Study.objects.filter(
        Q(ai_safety_impact__gte=2) | Q(ai_safety_impact__lte=-2),
        triggered_revisions__isnull=True,
        ai_summary__isnull=False,
    ).exclude(ai_summary="")

    processed = 0
    for study in studies:
        for link in study.foodstudy_set.select_related("food").all():
            food = link.food
            revision = propose_adjustment(food, study)
            if revision:
                apply_revision(revision)
                print(f"  Updated {food.name}: safety {revision.old_safety_score}→{revision.new_safety_score}, health {revision.old_health_index}→{revision.new_health_index}")
                processed += 1

    return {"processed": processed}


def main():
    parser = argparse.ArgumentParser(description="Adjust safety scores based on AI-analyzed studies")
    parser.add_argument("--auto", action="store_true", help="Process all pending adjustments automatically")
    args = parser.parse_args()

    if args.auto:
        print(f"[{datetime.utcnow().isoformat()}] Safety adjuster starting")
        result = run_auto_adjustment()
        print(f"[{datetime.utcnow().isoformat()}] Processed {result['processed']} adjustment(s)")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
