"""
nutrii — USDA Bulk Food Fetcher

Builds a larger seed set from USDA FoodData Central search results.

Usage:
    python scripts/fetchers/fetch_usda_bulk.py --limit 5000 --output data/seed/foods
    python scripts/fetchers/fetch_usda_bulk.py --queries-file data/usda_queries.txt --limit 5000
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.fetchers.fetch_usda import get_food_detail, get_food_details, nutrients_to_links, search_food
from scripts.pipeline.config import RATE_LIMITS
from scripts.pipeline.models import FoodEntry


DEFAULT_QUERIES = [
    "fruit",
    "vegetable",
    "leafy green",
    "root vegetable",
    "legume",
    "bean",
    "lentil",
    "pea",
    "grain",
    "rice",
    "wheat",
    "oat",
    "barley",
    "corn",
    "nut",
    "seed",
    "spice",
    "herb",
    "mushroom",
    "seaweed",
    "meat",
    "beef",
    "pork",
    "chicken",
    "turkey",
    "fish",
    "shellfish",
    "egg",
    "milk",
    "cheese",
    "yogurt",
    "oil",
    "flour",
    "apple",
    "banana",
    "orange",
    "berry",
    "tomato",
    "potato",
    "carrot",
    "onion",
    "garlic",
    "pepper",
    "cabbage",
    "broccoli",
    "spinach",
    "lettuce",
    "squash",
    "cucumber",
    "melon",
    "citrus",
    "tropical fruit",
    "stone fruit",
    "whole grain",
    "breakfast cereal",
    "pasta",
    "bread",
    "tofu",
    "soy",
    "fermented",
    "pickled",
    "tea",
    "coffee",
    "cocoa",
]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:100] or "food"


def load_queries(path: Path | None) -> list[str]:
    if not path:
        return DEFAULT_QUERIES
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def category_from_detail(detail: dict) -> str:
    category = detail.get("foodCategory") or detail.get("wweiaFoodCategory")
    if isinstance(category, dict):
        return category.get("description") or category.get("code") or "Uncategorized"
    if isinstance(category, str):
        return category
    return "Uncategorized"


def build_entry(detail: dict) -> FoodEntry:
    fdc_id = detail.get("fdcId")
    return FoodEntry(
        name=detail.get("description") or f"USDA food {fdc_id}",
        aliases=[],
        category=category_from_detail(detail),
        origin="",
        overall_safety_score=None,
        health_index=None,
        image_url="",
        metadata={
            "source": "USDA FoodData Central",
            "usda_fdc_id": fdc_id,
            "data_type": detail.get("dataType"),
            "source_url": f"https://fdc.nal.usda.gov/fdc-app.html#/food-details/{fdc_id}/nutrients"
            if fdc_id
            else "",
        },
        molecules=nutrients_to_links(detail),
    )


def collect_fdc_ids(
    queries: list[str],
    page_size: int,
    limit: int,
    max_pages_per_query: int = 10,
) -> list[int]:
    seen: set[int] = set()
    ordered: list[int] = []

    for query in queries:
        for page_number in range(1, max_pages_per_query + 1):
            print(f"Searching USDA: {query} page {page_number}")
            results = search_food(query, page_size=page_size, page_number=page_number)
            if not results:
                break

            for result in results:
                fdc_id = result.get("fdcId")
                if not fdc_id or fdc_id in seen:
                    continue
                seen.add(fdc_id)
                ordered.append(fdc_id)
                if len(ordered) >= limit:
                    return ordered
            time.sleep(1 / RATE_LIMITS["usda"])

    return ordered


def run(args) -> None:
    args.output.mkdir(parents=True, exist_ok=True)
    queries = load_queries(args.queries_file)
    candidate_limit = max(args.limit, args.limit * args.candidate_multiplier)
    fdc_ids = collect_fdc_ids(queries, args.page_size, candidate_limit, args.max_pages_per_query)
    print(f"Collected {len(fdc_ids)} unique USDA FDC IDs")

    written = 0
    detail_batch_size = max(1, args.detail_batch_size)
    for batch_start in range(0, len(fdc_ids), detail_batch_size):
        if written >= args.limit:
            break
        batch_ids = fdc_ids[batch_start : batch_start + detail_batch_size]
        try:
            details = get_food_details(batch_ids)
        except Exception as exc:
            print(
                f"Detail batch {batch_ids[0]}..{batch_ids[-1]} failed: {exc}; "
                "falling back to per-food detail fetch"
            )
            details = []
            for fdc_id in batch_ids:
                try:
                    details.append(get_food_detail(fdc_id))
                except Exception as fallback_exc:
                    print(f"skipped {fdc_id}: {fallback_exc}")

        for offset, detail in enumerate(details, start=0):
            if written >= args.limit:
                break
            index = batch_start + offset + 1
            fdc_id = detail.get("fdcId")
            try:
                entry = build_entry(detail)
                filename = f"{slugify(entry.name)}-{fdc_id}.json"
                output_path = args.output / filename
                output_path.write_text(
                    json.dumps(entry.model_dump(mode="json"), indent=2),
                    encoding="utf-8",
                )
                written += 1
                print(f"[{index}/{len(fdc_ids)}] wrote {output_path}")
            except Exception as exc:
                print(f"[{index}/{len(fdc_ids)}] skipped {fdc_id}: {exc}")
        time.sleep(1 / RATE_LIMITS["usda"])

    print(f"Done. Wrote {written} food seed file(s) to {args.output}")
    if written < args.limit:
        print(
            f"Warning: requested {args.limit}, but only {written} valid USDA detail records were written. "
            "Try increasing --page-size, --candidate-multiplier, --max-pages-per-query, or using a broader --queries-file."
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch many USDA foods into data/seed/foods")
    parser.add_argument("--queries-file", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/seed/foods"))
    parser.add_argument("--limit", type=int, default=5000)
    parser.add_argument("--page-size", type=int, default=200)
    parser.add_argument("--max-pages-per-query", type=int, default=10)
    parser.add_argument("--detail-batch-size", type=int, default=50)
    parser.add_argument(
        "--candidate-multiplier",
        type=int,
        default=3,
        help="Collect extra USDA search IDs so skipped/404 detail records do not reduce the requested output count",
    )
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
