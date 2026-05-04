"""
nutrii — Guide Updater

Triggered after a safety adjustment to propose guide updates if new patterns
are discovered.

Usage:
    python scripts/update_guide.py --food-id <uuid> --revision-id <uuid>
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from ai.dispatcher import OpenRouterDispatcher
from core.models import Food, IngredientAIGuide, SafetyScoreRevision


def update_guide(food: Food, revision: SafetyScoreRevision) -> IngredientAIGuide | None:
    """Propose a guide update after a safety score change."""
    current_guide = food.ai_guides.first()
    if not current_guide:
        return None

    prompt = f"""The following agent guide governs how AI scores are adjusted for {food.name}.
A new study has caused a safety score change:

OLD SCORES: safety={revision.old_safety_score}, health={revision.old_health_index}
NEW SCORES: safety={revision.new_safety_score}, health={revision.new_health_index}
REASON: {revision.reason}

CURRENT GUIDE:
{current_guide.guide_markdown}

If this study reveals a new pattern that should be added to the guide (e.g., a new scoring rule,
a new journal red flag, or updated historical context), output an updated Markdown guide.
If no update is needed, output the exact same guide unchanged.

Return ONLY valid JSON:
{{
  "markdown_content": "string",
  "version": {current_guide.version + 1}
}}
"""

    dispatcher = OpenRouterDispatcher()
    try:
        result = dispatcher.dispatch("guide_generation", prompt=prompt)
    except Exception as exc:
        print(f"  Guide update failed for {food.name}: {exc}")
        return None

    # Only save if content actually changed
    if result.markdown_content.strip() == current_guide.guide_markdown.strip():
        print(f"  No guide changes needed for {food.name}")
        return current_guide

    new_guide = IngredientAIGuide.objects.create(
        food=food,
        guide_markdown=result.markdown_content,
        version=result.version,
        generated_by=dispatcher.selector.pick_best_model("guide_generation"),
    )
    print(f"  Updated guide to v{new_guide.version} for {food.name}")
    return new_guide


def main():
    parser = argparse.ArgumentParser(description="Update agent guide after safety adjustment")
    parser.add_argument("--food-id", required=True, help="Food UUID")
    parser.add_argument("--revision-id", required=True, help="SafetyScoreRevision UUID")
    args = parser.parse_args()

    food = Food.objects.get(id=args.food_id)
    revision = SafetyScoreRevision.objects.get(id=args.revision_id)
    update_guide(food, revision)


if __name__ == "__main__":
    main()
