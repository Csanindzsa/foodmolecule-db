"""
nutrii — Bulk Inserter

Inserts validated pipeline entries into the Django / PostgreSQL database.
Designed for high-throughput seed data loading.

Usage:
    python scripts/loaders/bulk_insert.py --foods data/seed/foods/ --molecules data/seed/molecules/
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from uuid import UUID

# Ensure Django is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from django.db import transaction

from core.models import (
    Food,
    FoodCategory,
    FoodMolecule,
    Molecule,
    Study,
    FoodStudy,
)
from scripts.loaders.validate import validate_batch
from scripts.pipeline.models import FoodEntry, MoleculeEntry, StudyEntry
from scripts.transformers.normalizer import normalize_name


def get_or_create_category(name: str) -> FoodCategory:
    """Get or create a food category by name."""
    if not name:
        name = "Uncategorized"
    obj, _ = FoodCategory.objects.get_or_create(name=name.strip().title())
    return obj


def upsert_molecule(entry: MoleculeEntry) -> Molecule:
    """Insert or update a molecule."""
    defaults = {
        "name": entry.name,
        "iupac_name": entry.iupac_name,
        "cas_number": entry.cas_number,
        "molecular_formula": entry.molecular_formula,
        "molecular_weight": entry.molecular_weight,
        "harm_level": entry.harm_level,
        "harm_mechanisms": entry.harm_mechanisms,
        "classification_reasoning": entry.classification_reasoning,
        "threshold_concern_mg_per_day": entry.threshold_concern_mg_per_day,
        "is_heat_stable": entry.is_heat_stable,
        "is_neutralizable": entry.is_neutralizable,
        "structure_image_url": entry.structure_image_url,
        "metadata": entry.metadata,
    }
    if entry.pubchem_cid:
        obj, _ = Molecule.objects.update_or_create(
            pubchem_cid=entry.pubchem_cid,
            defaults=defaults,
        )
    else:
        obj, _ = Molecule.objects.update_or_create(
            name=entry.name,
            defaults=defaults,
        )
    return obj


def upsert_food(entry: FoodEntry) -> Food:
    """Insert or update a food."""
    category = get_or_create_category(entry.category) if entry.category else None

    defaults = {
        "name": entry.name,
        "aliases": entry.aliases,
        "origin": entry.origin,
        "overall_safety_score": entry.overall_safety_score,
        "health_index": entry.health_index,
        "ban_listed": entry.ban_listed,
        "image_url": entry.image_url,
        "metadata": entry.metadata,
    }
    obj, _ = Food.objects.update_or_create(
        id=entry.id,
        defaults=defaults,
    )
    if category:
        obj.category = category
        obj.save(update_fields=["category"])
    return obj


def link_food_molecules(food: Food, links: list) -> None:
    """Create FoodMolecule junction records."""
    for link in links:
        mol_name = normalize_name(link.molecule_name)
        if not mol_name:
            raise ValueError(f"Blank molecule name for food {food.name!r}")

        molecule = Molecule.objects.filter(name__iexact=mol_name).first()
        if not molecule:
            # Auto-create a stub molecule if missing
            molecule = Molecule.objects.create(name=mol_name)
        FoodMolecule.objects.update_or_create(
            food=food,
            molecule=molecule,
            defaults={
                "amount_per_100g": link.amount_per_100g,
                "unit": link.unit,
                "amount_notes": link.amount_notes,
                "is_beneficial": link.is_beneficial,
            },
        )


def load_json_entries(directory: Path, model_class):
    """Load all JSON files from a directory into pipeline model instances."""
    if not directory.exists():
        raise FileNotFoundError(f"Seed data directory does not exist: {directory}")
    if not directory.is_dir():
        raise NotADirectoryError(f"Seed data path is not a directory: {directory}")

    entries = []
    for path in sorted(directory.glob("*.json")):
        with open(path) as f:
            data = json.load(f)
        entries.append(model_class(**data))
    return entries


def validate_entries_or_raise(foods: list[FoodEntry], molecules: list[MoleculeEntry]) -> None:
    """Run JSON Schema validation before direct bulk insert writes."""
    errors = validate_batch(foods, molecules)
    if not errors:
        return

    first_entity, first_errors = next(iter(errors.items()))
    first_error = first_errors[0] if first_errors else "invalid entry"
    raise ValueError(
        f"Schema validation failed for {len(errors)} entr"
        f"{'y' if len(errors) == 1 else 'ies'}; {first_entity}: {first_error}"
    )


def main():
    parser = argparse.ArgumentParser(description="Bulk insert seed data into nutrii DB")
    parser.add_argument("--foods", type=Path, help="Directory containing food JSON files")
    parser.add_argument("--molecules", type=Path, help="Directory containing molecule JSON files")
    parser.add_argument("--dry-run", action="store_true", help="Validate without inserting")
    args = parser.parse_args()

    foods = load_json_entries(args.foods, FoodEntry) if args.foods else []
    molecules = load_json_entries(args.molecules, MoleculeEntry) if args.molecules else []

    print(f"Loaded {len(foods)} food(s) and {len(molecules)} molecule(s)")
    try:
        validate_entries_or_raise(foods, molecules)
    except ValueError as exc:
        print(f"VALIDATION FAILED — {exc}")
        sys.exit(1)

    if args.dry_run:
        print("Dry run complete — no inserts performed.")
        return

    with transaction.atomic():
        # Insert molecules first (foods depend on them)
        for mol_entry in molecules:
            upsert_molecule(mol_entry)
        print(f"Upserted {len(molecules)} molecule(s)")

        # Insert foods
        for food_entry in foods:
            food = upsert_food(food_entry)
            link_food_molecules(food, food_entry.molecules)
        print(f"Upserted {len(foods)} food(s)")

    print("Bulk insert complete.")


if __name__ == "__main__":
    main()
