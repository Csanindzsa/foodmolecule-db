"""
fetch_usda.py
Fetches food data from the USDA FoodData Central API.
Docs: https://fdc.nal.usda.gov/api-guide.html

Requirements: pip install httpx python-dotenv
Usage: python scripts/fetch_usda.py --food "spinach" --output data/foods/
"""

import httpx
import json
import argparse
import os
from pathlib import Path

USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"
API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")  # Get free key at https://fdc.nal.usda.gov/api-key-signup.html


def search_food(query: str, page_size: int = 5) -> list[dict]:
    """Search for foods by name."""
    url = f"{USDA_API_BASE}/foods/search"
    params = {
        "query": query,
        "api_key": API_KEY,
        "pageSize": page_size,
        "dataType": ["Foundation", "SR Legacy"],
    }
    with httpx.Client() as client:
        resp = client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json().get("foods", [])


def get_food_detail(fdc_id: int) -> dict:
    """Get detailed nutrient data for a specific food ID."""
    url = f"{USDA_API_BASE}/food/{fdc_id}"
    params = {"api_key": API_KEY}
    with httpx.Client() as client:
        resp = client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()


def usda_to_molecule_entries(food_detail: dict) -> list[dict]:
    """Convert USDA nutrient list to simplified molecule/nutrient entries."""
    entries = []
    for nutrient in food_detail.get("foodNutrients", []):
        n = nutrient.get("nutrient", {})
        entries.append({
            "name": n.get("name"),
            "pubchem_cid": None,  # To be filled by fetch_pubchem.py
            "amount_per_100g": str(nutrient.get("amount", "unknown")),
            "unit": n.get("unitName", ""),
            "harm_level": "none",  # Default — to be manually reviewed
            "harm_type": [],
            "notes": "Auto-imported from USDA FoodData Central — harm classification pending manual review."
        })
    return entries


def main():
    parser = argparse.ArgumentParser(description="Fetch food data from USDA FoodData Central")
    parser.add_argument("--food", required=True, help="Food name to search for")
    parser.add_argument("--output", default="data/foods/", help="Output directory")
    parser.add_argument("--fdc-id", type=int, help="Specific FDC ID (skip search)")
    args = parser.parse_args()

    if args.fdc_id:
        fdc_id = args.fdc_id
    else:
        results = search_food(args.food)
        if not results:
            print(f"No results found for '{args.food}'")
            return
        print(f"Found {len(results)} result(s). Using first: {results[0]['description']} (FDC ID: {results[0]['fdcId']})")
        fdc_id = results[0]["fdcId"]

    detail = get_food_detail(fdc_id)
    molecules = usda_to_molecule_entries(detail)

    # Build basic food entry skeleton
    food_entry = {
        "id": f"food_TBD",
        "name": detail.get("description", args.food),
        "aliases": [],
        "category": "TBD",
        "origin": "TBD",
        "molecules": molecules,
        "overall_safety": "safe",  # Default — review required
        "ban_listed": False,
        "sources": [f"USDA FoodData Central ID: {fdc_id}"]
    }

    output_path = Path(args.output) / f"{args.food.lower().replace(' ', '_')}_draft.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(food_entry, f, indent=2)

    print(f"Draft food entry saved to: {output_path}")
    print(f"⚠️  This is a DRAFT — manual review of harm levels is required before committing.")


if __name__ == "__main__":
    main()
