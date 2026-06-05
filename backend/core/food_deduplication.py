"""Backend helpers for normalizing food names and filtering duplicate foods.

These functions intentionally do not mutate source data. They provide an
opt-in backend/database response filter so the API can collapse obvious USDA
near-duplicates while keeping the raw records available for detail pages and
future curation.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from decimal import Decimal
from typing import Any

from .models import Food

# USDA descriptions contain many preparation/cut/source descriptors that are
# useful for the raw record but noisy when users search or compare foods.
_DESCRIPTOR_STOP_WORDS = {
    "added",
    "all",
    "and",
    "bone",
    "boneless",
    "cooked",
    "commercial",
    "distribution",
    "drained",
    "fat",
    "food",
    "foods",
    "for",
    "fresh",
    "frozen",
    "includes",
    "lean",
    "no",
    "of",
    "only",
    "or",
    "program",
    "raw",
    "roasted",
    "separable",
    "skin",
    "the",
    "to",
    "trimmed",
    "usda",
    "varieties",
    "variety",
    "with",
    "without",
}

_GRADE_WORDS = {"choice", "select", "prime", "grades", "grade"}
_SPECIES_SYNONYMS = {
    "cow": "beef",
    "cows": "beef",
    "cattle": "beef",
    "bovine": "beef",
}


def _ascii_lower(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return normalized.encode("ascii", "ignore").decode("ascii").lower()


def _singularize_token(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return f"{token[:-3]}y"
    if len(token) > 4 and token.endswith(("ches", "shes", "sses")):
        return token[:-2]
    if len(token) > 3 and token.endswith(("xes", "zes", "oes")):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def normalize_food_name(name: str) -> str:
    """Return a stable search/deduplication key for noisy food names.

    Examples:
    - "oranges, raw, all commercial varieties" -> "orange"
    - "beef, tenderloin, no bone, cow" -> "beef tenderloin"

    The key is deliberately conservative: cultivar words such as "granny smith"
    remain present, while preparation/source boilerplate is stripped.
    """

    text = _ascii_lower(name).replace("&", " and ")
    tokens = re.sub(r"[^a-z0-9]+", " ", text).split()

    cleaned: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        token = _SPECIES_SYNONYMS.get(token, token)
        token = _singularize_token(token)
        if token in _DESCRIPTOR_STOP_WORDS or token in _GRADE_WORDS:
            continue
        if token and token not in seen:
            cleaned.append(token)
            seen.add(token)
    return " ".join(cleaned)


def _normalized_decimal(value: Any) -> str:
    if value is None:
        return ""
    decimal = value if isinstance(value, Decimal) else Decimal(str(value))
    return format(decimal.normalize(), "f")


def food_molecule_signature(food: Food, *, include_amounts: bool = True) -> tuple[tuple[str, ...], ...]:
    """Build a deterministic molecule profile signature for a Food instance.

    By default the signature includes molecule id, amount, and unit. This keeps
    products such as raw orange and orange juice separate unless their recorded
    molecule profile is exactly identical. Passing ``include_amounts=False``
    collapses by molecule set only and should be used for audits, not default UI
    filtering, because USDA foods often share the same nutrient columns.
    """

    rows: list[tuple[str, ...]] = []
    for food_molecule in food.foodmolecule_set.all():
        molecule_id = str(food_molecule.molecule_id)
        if include_amounts:
            rows.append(
                (
                    molecule_id,
                    _normalized_decimal(food_molecule.amount_per_100g),
                    (food_molecule.unit or "").strip().lower(),
                )
            )
        else:
            rows.append((molecule_id,))
    return tuple(sorted(rows))


def _representative_sort_key(food: Food) -> tuple[int, int, str, str]:
    health_index = food.health_index if food.health_index is not None else -1
    return (-health_index, len(normalize_food_name(food.name)), food.name.lower(), str(food.id))


def dedupe_foods_by_molecule_signature(
    foods: Iterable[Food],
    *,
    include_amounts: bool = True,
) -> list[Food]:
    """Collapse foods with identical molecule signatures to one representative.

    Empty molecule profiles are never collapsed together; they do not provide
    enough evidence that two foods are equivalent. Representatives are chosen
    deterministically: highest health_index first, then shortest normalized name,
    then lexical name/id for stable output.
    """

    representatives: dict[tuple[tuple[str, ...], ...] | tuple[str, str], Food] = {}
    for food in foods:
        signature = food_molecule_signature(food, include_amounts=include_amounts)
        key: tuple[tuple[str, ...], ...] | tuple[str, str]
        key = signature if signature else ("empty", str(food.id))
        current = representatives.get(key)
        if current is None or _representative_sort_key(food) < _representative_sort_key(current):
            representatives[key] = food

    return sorted(representatives.values(), key=_representative_sort_key)


def dedupe_foods_by_normalized_name(foods: Iterable[Food]) -> list[Food]:
    """Collapse foods sharing the same normalized food-name key.

    This is useful for curation/audit views. It is more aggressive than exact
    molecule-profile filtering and therefore remains opt-in.
    """

    representatives: dict[str | tuple[str, str], Food] = {}
    for food in foods:
        normalized = normalize_food_name(food.name)
        key: str | tuple[str, str] = normalized or ("empty", str(food.id))
        current = representatives.get(key)
        if current is None or _representative_sort_key(food) < _representative_sort_key(current):
            representatives[key] = food
    return sorted(representatives.values(), key=_representative_sort_key)
