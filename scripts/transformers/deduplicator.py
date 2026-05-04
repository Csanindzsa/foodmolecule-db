"""
nutrii — Deduplicator

Merges duplicate foods and molecules based on name/alias overlap.
Prevents the same entity from being inserted under different names.
"""

from __future__ import annotations

from scripts.pipeline.models import FoodEntry, MoleculeEntry


def jaccard_similarity(a: set, b: set) -> float:
    """Compute Jaccard similarity between two sets."""
    if not a and not b:
        return 1.0
    intersection = a & b
    union = a | b
    return len(intersection) / len(union) if union else 0.0


def is_duplicate_food(a: FoodEntry, b: FoodEntry, threshold: float = 0.8) -> bool:
    """Check if two foods are duplicates based on name/alias overlap."""
    names_a = {a.name} | set(a.aliases)
    names_b = {b.name} | set(b.aliases)
    return jaccard_similarity(names_a, names_b) >= threshold


def is_duplicate_molecule(a: MoleculeEntry, b: MoleculeEntry) -> bool:
    """Check if two molecules are duplicates."""
    # Exact name match
    if a.name == b.name:
        return True
    # Same PubChem CID
    if a.pubchem_cid and b.pubchem_cid and a.pubchem_cid == b.pubchem_cid:
        return True
    # Same CAS number
    if a.cas_number and b.cas_number and a.cas_number == b.cas_number:
        return True
    return False


def deduplicate_foods(foods: list[FoodEntry]) -> list[FoodEntry]:
    """Remove duplicate foods, merging aliases from duplicates."""
    unique: list[FoodEntry] = []
    for food in foods:
        matched = False
        for existing in unique:
            if is_duplicate_food(food, existing):
                # Merge aliases
                existing.aliases = list(dict.fromkeys(existing.aliases + food.aliases))
                # Merge molecules (simple append — loader handles junction logic)
                existing.molecules.extend(food.molecules)
                # Keep the more complete metadata
                if not existing.metadata and food.metadata:
                    existing.metadata = food.metadata
                matched = True
                break
        if not matched:
            unique.append(food)
    return unique


def deduplicate_molecules(molecules: list[MoleculeEntry]) -> list[MoleculeEntry]:
    """Remove duplicate molecules."""
    unique: list[MoleculeEntry] = []
    for mol in molecules:
        matched = False
        for existing in unique:
            if is_duplicate_molecule(mol, existing):
                # Merge metadata
                if not existing.pubchem_cid and mol.pubchem_cid:
                    existing.pubchem_cid = mol.pubchem_cid
                if not existing.cas_number and mol.cas_number:
                    existing.cas_number = mol.cas_number
                if not existing.molecular_formula and mol.molecular_formula:
                    existing.molecular_formula = mol.molecular_formula
                matched = True
                break
        if not matched:
            unique.append(mol)
    return unique


def deduplicate_all(
    foods: list[FoodEntry],
    molecules: list[MoleculeEntry],
) -> tuple[list[FoodEntry], list[MoleculeEntry]]:
    """Deduplicate a batch of foods and molecules."""
    return (
        deduplicate_foods(foods),
        deduplicate_molecules(molecules),
    )
