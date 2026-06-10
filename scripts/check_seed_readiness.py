"""Check whether local seed files are ready for a launch database load."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts import validate_schema

DEFAULT_SEED_DIR = PROJECT_ROOT / "data" / "seed"
DEFAULT_MIN_FOODS = 100
DEFAULT_MIN_MOLECULES = 4


@dataclass(frozen=True)
class SeedReadiness:
    food_count: int
    molecule_count: int
    category_count: int
    food_schema_failures: int
    molecule_schema_failures: int
    min_foods: int
    min_molecules: int

    @property
    def ok(self) -> bool:
        return (
            self.food_schema_failures == 0
            and self.molecule_schema_failures == 0
            and self.food_count >= self.min_foods
            and self.molecule_count >= self.min_molecules
        )


def _json_paths(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(path.rglob("*.json"))


def _load_json(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def count_categories(food_paths: list[Path]) -> int:
    categories = Counter()
    for path in food_paths:
        try:
            category = str(_load_json(path).get("category", "")).strip()
        except (OSError, json.JSONDecodeError):
            continue
        if category:
            categories[category] += 1
    return len(categories)


def check_seed_readiness(
    seed_dir: Path,
    *,
    min_foods: int = DEFAULT_MIN_FOODS,
    min_molecules: int = DEFAULT_MIN_MOLECULES,
) -> SeedReadiness:
    foods_dir = seed_dir / "foods"
    molecules_dir = seed_dir / "molecules"
    food_paths = _json_paths(foods_dir)
    molecule_paths = _json_paths(molecules_dir)
    food_failures = validate_schema.validate_files("food", food_paths) if food_paths else {}
    molecule_failures = validate_schema.validate_files("molecule", molecule_paths) if molecule_paths else {}

    return SeedReadiness(
        food_count=len(food_paths),
        molecule_count=len(molecule_paths),
        category_count=count_categories(food_paths),
        food_schema_failures=len(food_failures),
        molecule_schema_failures=len(molecule_failures),
        min_foods=min_foods,
        min_molecules=min_molecules,
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate launch seed data readiness.")
    parser.add_argument("--seed-dir", type=Path, default=DEFAULT_SEED_DIR, help="Seed directory containing foods/ and molecules/.")
    parser.add_argument("--min-foods", type=int, default=DEFAULT_MIN_FOODS, help="Minimum food JSON files required.")
    parser.add_argument("--min-molecules", type=int, default=DEFAULT_MIN_MOLECULES, help="Minimum molecule JSON files required.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.min_foods < 0 or args.min_molecules < 0:
        print("error: minimum counts must be non-negative", file=sys.stderr)
        return 2

    readiness = check_seed_readiness(
        args.seed_dir,
        min_foods=args.min_foods,
        min_molecules=args.min_molecules,
    )
    lines = [
        ("foods", readiness.food_count, readiness.min_foods, readiness.food_schema_failures),
        ("molecules", readiness.molecule_count, readiness.min_molecules, readiness.molecule_schema_failures),
    ]
    for label, count, minimum, failures in lines:
        status = "ok" if failures == 0 and count >= minimum else "FAIL"
        print(f"{status}\t{label}\tcount={count}\tminimum={minimum}\tschema_failures={failures}")
    print(f"ok\tcategories\tcount={readiness.category_count}")

    return 0 if readiness.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
