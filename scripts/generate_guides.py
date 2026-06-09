"""
nutrii — Agent Guide Generator

Generates initial agent instruction guides for all foods in the database.

Usage:
    python scripts/generate_guides.py --food-id <uuid>
    python scripts/generate_guides.py --all
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from ai.dispatcher import OpenRouterDispatcher
from core.models import Food, IngredientAIGuide
from scripts.pipeline.config import PROJECT_ROOT


def guide_slug(value: str) -> str:
    """Return a filesystem-safe guide filename stem."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:90] or "guide"


def next_guide_version(food: Food) -> int:
    latest = food.ai_guides.order_by("-version").first()
    return latest.version + 1 if latest else 1


def generate_guide(food: Food) -> tuple[str, str] | None:
    """Generate an agent instruction guide for a specific food."""
    molecules = food.foodmolecule_set.select_related("molecule").all()
    molecule_data = [
        {"name": fm.molecule.name, "harm_level": fm.molecule.harm_level, "is_beneficial": fm.is_beneficial}
        for fm in molecules
    ]

    dispatcher = OpenRouterDispatcher()
    try:
        result = dispatcher.dispatch(
            "guide_generation",
            template_vars={
                "food_name": food.name,
                "category": food.category.name if food.category else "",
                "molecules": molecule_data,
                "safety_score": food.overall_safety_score or 50,
                "health_index": food.health_index or 50,
            },
        )
    except Exception as exc:
        print(f"  Failed to generate guide for {food.name}: {exc}")
        return None

    return result.markdown_content, dispatcher.last_model_used or "unknown"


def save_guide(food: Food, markdown: str, model_used: str, version: int | None = None) -> IngredientAIGuide:
    """Save the generated guide to the database and disk."""
    guide = IngredientAIGuide.objects.create(
        food=food,
        guide_markdown=markdown,
        version=version or next_guide_version(food),
        generated_by=model_used,
    )

    # Also write to disk for version control backup
    guides_dir = PROJECT_ROOT / "guides" / "ingredients"
    guides_dir.mkdir(parents=True, exist_ok=True)
    path = guides_dir / f"{guide_slug(food.name)}.md"
    with open(path, "w", encoding="utf-8") as f:
        f.write(markdown)

    return guide


def run_generator(food_id: str | None = None, force: bool = False) -> dict:
    """Generate guides for one or all foods."""
    if food_id:
        foods = Food.objects.filter(id=food_id)
    else:
        foods = Food.objects.all()
    if not force:
        foods = foods.filter(ai_guides__isnull=True)

    created = 0
    for food in foods:
        guide_result = generate_guide(food)
        if guide_result:
            markdown, model_used = guide_result
            save_guide(food, markdown, model_used)
            created += 1
            print(f"  Generated guide for {food.name}")

    return {"created": created}


def main():
    parser = argparse.ArgumentParser(description="Generate AI agent instruction guides")
    parser.add_argument("--food-id", help="Specific food UUID")
    parser.add_argument("--all", action="store_true", help="Generate for all foods")
    parser.add_argument("--force", action="store_true", help="Create a new version even if a guide exists")
    args = parser.parse_args()

    if not args.food_id and not args.all:
        parser.print_help()
        return

    result = run_generator(food_id=args.food_id, force=args.force)
    print(f"Done. Created {result['created']} guide(s).")


if __name__ == "__main__":
    main()
