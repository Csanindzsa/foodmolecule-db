"""
nutrii — Schema Validator

Validates pipeline entries against JSON Schema before any DB insert.
Uses jsonschema for strict validation.
"""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft7Validator, ValidationError

from scripts.pipeline.config import SCHEMA_DIR
from scripts.pipeline.models import FoodEntry, MoleculeEntry, StudyEntry

# Cache loaded schemas
_SCHEMA_CACHE: dict[str, dict] = {}


def load_schema(name: str) -> dict:
    """Load a JSON Schema from disk (cached)."""
    if name not in _SCHEMA_CACHE:
        path = SCHEMA_DIR / name
        with open(path) as f:
            _SCHEMA_CACHE[name] = json.load(f)
    return _SCHEMA_CACHE[name]


def validate_food(entry: FoodEntry | dict) -> list[str]:
    """Validate a food entry against food.schema.json. Returns list of errors."""
    schema = load_schema("food.schema.json")
    data = entry if isinstance(entry, dict) else entry.model_dump(mode="json")
    validator = Draft7Validator(schema)
    return [str(e) for e in validator.iter_errors(data)]


def validate_molecule(entry: MoleculeEntry | dict) -> list[str]:
    """Validate a molecule entry against molecule.schema.json. Returns list of errors."""
    schema = load_schema("molecule.schema.json")
    data = entry if isinstance(entry, dict) else entry.model_dump(mode="json")
    validator = Draft7Validator(schema)
    return [str(e) for e in validator.iter_errors(data)]


def validate_study(entry: StudyEntry | dict) -> list[str]:
    """Validate a study entry against study.schema.json. Returns list of errors."""
    schema = load_schema("study.schema.json")
    data = entry if isinstance(entry, dict) else entry.model_dump(mode="json")
    validator = Draft7Validator(schema)
    return [str(e) for e in validator.iter_errors(data)]


def validate_batch(
    foods: list[FoodEntry],
    molecules: list[MoleculeEntry],
    studies: list[StudyEntry] | None = None,
) -> dict[str, list[str]]:
    """Validate a full batch. Returns {entity_id: [errors]}."""
    errors: dict[str, list[str]] = {}

    for food in foods:
        errs = validate_food(food)
        if errs:
            errors[str(food.id)] = errs

    for mol in molecules:
        errs = validate_molecule(mol)
        if errs:
            errors[str(mol.id)] = errs

    if studies:
        for study in studies:
            errs = validate_study(study)
            if errs:
                errors[str(study.id)] = errs

    return errors
