"""
nutrii — Health Index Engine

Computes the nutrii Health Index (NHI) for any food.
Base algorithm is rule-based; AI can propose overrides within ±15 points.
"""

from __future__ import annotations

from dataclasses import dataclass

from core.models import Food, FoodMolecule, Molecule


@dataclass
class HealthIndexResult:
    score: int
    benefit_score: int
    safety_score: int
    bioavailability_score: int
    label: str


HARM_PENALTIES = {
    0: 0,
    1: 1,
    2: 3,
    3: 10,
    4: 20,
    5: 40,
}

BENEFIT_WEIGHTS = {
    "vitamin": 3,
    "mineral": 3,
    "polyphenol": 2,
    "antioxidant": 2,
    "fiber": 1,
    "omega-3": 2,
    "prebiotic": 2,
    "protein": 1,
    "general": 1,
}


def score_to_label(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Fair"
    if score >= 45:
        return "Caution"
    if score >= 25:
        return "Poor"
    return "Avoid"


def compute_benefit_score(food: Food) -> int:
    """Sum weighted beneficial molecules."""
    score = 0
    for fm in food.foodmolecule_set.select_related("molecule").all():
        if not fm.is_beneficial:
            continue
        mol = fm.molecule
        # Heuristic categorization based on name
        name_lower = mol.name.lower()
        weight = BENEFIT_WEIGHTS["general"]
        for keyword, w in BENEFIT_WEIGHTS.items():
            if keyword in name_lower:
                weight = w
                break
        score += weight

    # Cap at 100
    return min(100, score)


def compute_safety_score(food: Food) -> int:
    """Start at 100 and subtract penalties for harmful molecules."""
    score = 100
    harmful = []

    for fm in food.foodmolecule_set.select_related("molecule").all():
        mol = fm.molecule
        if mol.harm_level >= 2:
            harmful.append((fm, mol))

    for fm, mol in harmful:
        penalty = HARM_PENALTIES.get(mol.harm_level, 0)
        if not mol.is_neutralizable:
            # Assume raw consumption penalty if no standard neutralization
            penalty = int(penalty * 1.3)
        score -= penalty

    # Synergy multiplier: >=2 high/moderate compounds
    high_mod = [m for _, m in harmful if m.harm_level >= 3]
    if len(high_mod) >= 2:
        score = int(score * 0.8)

    return max(0, score)


def compute_bioavailability_score(food: Food) -> int:
    """Penalize antinutrient load unless neutralization is standard."""
    score = 100
    for fm in food.foodmolecule_set.select_related("molecule").all():
        mol = fm.molecule
        is_antinutrient = any(
            tag in mol.harm_mechanisms
            for tag in ("antinutrient", "mineral_absorption_inhibitor", "protease_inhibitor")
        )
        if not is_antinutrient:
            continue
        if not mol.is_neutralizable:
            score -= 5
        else:
            # Assume partial neutralization in typical preparation
            score -= 2

    return max(0, score)


def compute_health_index(food: Food) -> HealthIndexResult:
    """
    Compute the full nutrii Health Index (NHI).

    Formula:
        NHI = (Benefit_Score * 0.4) + (Safety_Score * 0.4) + (Bioavailability_Score * 0.2)
    """
    benefit = compute_benefit_score(food)
    safety = compute_safety_score(food)
    bio = compute_bioavailability_score(food)

    nhi = int((benefit * 0.4) + (safety * 0.4) + (bio * 0.2))
    nhi = max(0, min(100, nhi))

    return HealthIndexResult(
        score=nhi,
        benefit_score=benefit,
        safety_score=safety,
        bioavailability_score=bio,
        label=score_to_label(nhi),
    )
