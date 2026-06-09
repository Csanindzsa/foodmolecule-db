"""
nutrii — USDA FoodData Central Fetcher

Fetches food + nutrient data from USDA FoodData Central.
Outputs pipeline-compatible FoodEntry JSON.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

from scripts.pipeline.config import MAX_RETRIES, RATE_LIMITS, USDA_API_BASE, USDA_API_KEY
from scripts.pipeline.models import FoodEntry, FoodMoleculeLink

USDA_SEARCH_DATA_TYPES = ["Foundation", "SR Legacy"]


def _is_retryable_status(status_code: int) -> bool:
    return status_code == 429 or 500 <= status_code < 600


def _request_with_retries(client: httpx.Client, method: str, url: str, **kwargs) -> httpx.Response:
    last_exc: httpx.HTTPError | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = getattr(client, method)(url, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if not _is_retryable_status(exc.response.status_code) or attempt == MAX_RETRIES:
                raise
        except httpx.HTTPError as exc:
            last_exc = exc
            if attempt == MAX_RETRIES:
                raise
        time.sleep((1 / RATE_LIMITS["usda"]) * attempt)

    if last_exc:
        raise last_exc
    raise RuntimeError("USDA request failed without an exception")


def search_food(query: str, page_size: int = 5, page_number: int = 1) -> list[dict]:
    """Search for foods by name."""
    url = f"{USDA_API_BASE}/foods/search"
    foods: list[dict] = []
    seen_ids: set[int] = set()

    with httpx.Client() as client:
        for data_type in USDA_SEARCH_DATA_TYPES:
            params = {
                "query": query,
                "api_key": USDA_API_KEY,
                "pageSize": page_size,
                "pageNumber": page_number,
                "dataType": data_type,
            }
            resp = _request_with_retries(client, "get", url, params=params, timeout=30)

            for food in resp.json().get("foods", []):
                fdc_id = food.get("fdcId")
                if not fdc_id or fdc_id in seen_ids:
                    continue
                seen_ids.add(fdc_id)
                foods.append(food)

    return foods


def get_food_details(fdc_ids: list[int]) -> list[dict]:
    """Get detailed nutrient data for many FDC IDs in one USDA request."""
    if not fdc_ids:
        return []

    url = f"{USDA_API_BASE}/foods"
    params = {"api_key": USDA_API_KEY}
    payload = {"fdcIds": fdc_ids}
    with httpx.Client() as client:
        resp = _request_with_retries(client, "post", url, params=params, json=payload, timeout=60)
        return resp.json()


def get_food_detail(fdc_id: int) -> dict:
    """Get detailed nutrient data for a specific food ID."""
    url = f"{USDA_API_BASE}/food/{fdc_id}"
    params = {"api_key": USDA_API_KEY}
    with httpx.Client() as client:
        resp = _request_with_retries(client, "get", url, params=params, timeout=30)
        return resp.json()


def nutrients_to_links(food_detail: dict) -> list[FoodMoleculeLink]:
    """Convert USDA nutrient list to FoodMoleculeLink objects."""
    links = []
    for nutrient in food_detail.get("foodNutrients", []):
        n = nutrient.get("nutrient", {})
        name = n.get("name", "Unknown")
        amount = nutrient.get("amount")
        unit = n.get("unitName", "")

        # Skip non-nutrient entries
        if not name or name.lower() in {"ash", "water", "nitrogen"}:
            continue

        links.append(
            FoodMoleculeLink(
                molecule_name=name,
                amount_per_100g=float(amount) if amount is not None else None,
                unit=unit,
                amount_notes="Auto-imported from USDA FoodData Central",
                is_beneficial=True,  # Default assumption for USDA-listed nutrients
            )
        )
    return links


def fetch_food(query: str, fdc_id: int | None = None) -> FoodEntry | None:
    """Fetch and build a FoodEntry from USDA."""
    if fdc_id:
        detail = get_food_detail(fdc_id)
    else:
        results = search_food(query)
        if not results:
            return None
        detail = get_food_detail(results[0]["fdcId"])

    links = nutrients_to_links(detail)

    return FoodEntry(
        name=detail.get("description", query),
        aliases=[],
        category="",  # To be classified by AI or manual mapping
        origin="",
        overall_safety_score=None,
        health_index=None,
        metadata={
            "fdc_id": detail.get("fdcId"),
            "data_type": detail.get("dataType"),
            "source": "USDA FoodData Central",
        },
        molecules=links,
    )


def main():
    parser = argparse.ArgumentParser(description="Fetch food data from USDA")
    parser.add_argument("--food", required=True, help="Food name to search")
    parser.add_argument("--fdc-id", type=int, help="Specific FDC ID")
    parser.add_argument("--output", type=Path, default=Path("data/seed/foods"), help="Output directory")
    args = parser.parse_args()

    entry = fetch_food(args.food, args.fdc_id)
    if not entry:
        print(f"No results found for '{args.food}'")
        return

    output_path = args.output / f"{entry.name.replace(' ', '_')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(entry.model_dump(mode="json"), f, indent=2)

    print(f"Food entry saved to: {output_path} ({len(entry.molecules)} molecules linked)")


if __name__ == "__main__":
    main()
