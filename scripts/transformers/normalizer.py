"""
nutrii — Data Normalizer

Canonicalizes food and molecule names, converts units, and enriches
metadata before deduplication and validation.
"""

from __future__ import annotations

import re
from pathlib import Path

from scripts.pipeline.models import FoodEntry, MoleculeEntry

# Common unit mappings
UNIT_ALIASES = {
    "g": "g",
    "gram": "g",
    "grams": "g",
    "mg": "mg",
    "milligram": "mg",
    "milligrams": "mg",
    "µg": "µg",
    "mcg": "µg",
    "microgram": "µg",
    "micrograms": "µg",
    "iu": "IU",
    "kcal": "kcal",
    "kj": "kJ",
}

# Common name substitutions
NAME_SUBSTITUTIONS = {
    "spinacia oleracea": "spinach",
    "solanum lycopersicum": "tomato",
    "allium cepa": "onion",
    "allium sativum": "garlic",
}


def normalize_unit(unit: str) -> str:
    """Convert a raw unit string to canonical form."""
    key = unit.strip().lower().rstrip("s")
    return UNIT_ALIASES.get(key, unit.strip())


def normalize_name(name: str) -> str:
    """Canonicalize a food or molecule name."""
    name = name.strip().lower()
    name = NAME_SUBSTITUTIONS.get(name, name)
    # Remove parenthetical annotations
    name = re.sub(r"\s*\([^)]*\)", "", name)
    # Collapse multiple spaces
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def normalize_food(food: FoodEntry) -> FoodEntry:
    """Apply all normalizations to a FoodEntry."""
    food.name = normalize_name(food.name)
    food.aliases = [normalize_name(a) for a in food.aliases if a.strip()]
    # Deduplicate aliases
    food.aliases = list(dict.fromkeys(food.aliases))
    # Normalize molecule links
    for link in food.molecules:
        link.molecule_name = normalize_name(link.molecule_name)
        link.unit = normalize_unit(link.unit)
    return food


def normalize_molecule(mol: MoleculeEntry) -> MoleculeEntry:
    """Apply all normalizations to a MoleculeEntry."""
    mol.name = normalize_name(mol.name)
    return mol


def normalize_all(
    foods: list[FoodEntry],
    molecules: list[MoleculeEntry],
) -> tuple[list[FoodEntry], list[MoleculeEntry]]:
    """Normalize a batch of foods and molecules."""
    return (
        [normalize_food(f) for f in foods],
        [normalize_molecule(m) for m in molecules],
    )
