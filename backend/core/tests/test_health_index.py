"""
Tests for the nutrii Health Index engine.
"""

import pytest

from core.health_index import (
    compute_benefit_score,
    compute_bioavailability_score,
    compute_health_index,
    compute_safety_score,
    score_to_label,
)
from core.models import Food, FoodMolecule, Molecule


@pytest.fixture
def spinach():
    food = Food.objects.create(name="spinach", overall_safety_score=75, health_index=82)
    oxalic = Molecule.objects.create(name="oxalic acid", harm_level=3, is_neutralizable=True)
    iron = Molecule.objects.create(name="iron", harm_level=0)
    FoodMolecule.objects.create(food=food, molecule=oxalic, is_beneficial=False)
    FoodMolecule.objects.create(food=food, molecule=iron, is_beneficial=True)
    return food


@pytest.mark.django_db
def test_score_to_label(spinach):
    assert score_to_label(95) == "Excellent"
    assert score_to_label(80) == "Good"
    assert score_to_label(65) == "Fair"
    assert score_to_label(50) == "Caution"
    assert score_to_label(30) == "Poor"
    assert score_to_label(10) == "Avoid"


@pytest.mark.django_db
def test_compute_benefit_score(spinach):
    score = compute_benefit_score(spinach)
    assert score > 0  # iron is beneficial


@pytest.mark.django_db
def test_compute_safety_score(spinach):
    score = compute_safety_score(spinach)
    # oxalic acid (moderate=3) → penalty 10, neutralizable so no 1.3x
    assert score == 90


@pytest.mark.django_db
def test_compute_bioavailability_score(spinach):
    score = compute_bioavailability_score(spinach)
    # oxalic acid is not tagged as antinutrient in harm_mechanisms by default
    assert score == 100


@pytest.mark.django_db
def test_compute_health_index(spinach):
    result = compute_health_index(spinach)
    assert 0 <= result.score <= 100
    assert result.benefit_score > 0
    assert result.safety_score > 0
    assert result.label in {"Excellent", "Good", "Fair", "Caution", "Poor", "Avoid"}


@pytest.mark.django_db
def test_safety_score_with_non_neutralizable():
    food = Food.objects.create(name="toxic test food")
    toxin = Molecule.objects.create(name="tetrodotoxin", harm_level=5, is_neutralizable=False)
    FoodMolecule.objects.create(food=food, molecule=toxin, is_beneficial=False)

    score = compute_safety_score(food)
    # critical (5) → 40 penalty * 1.3 = 52
    assert score == 48


@pytest.mark.django_db
def test_safety_score_synergy_penalty():
    food = Food.objects.create(name="double toxin food")
    t1 = Molecule.objects.create(name="toxin a", harm_level=4, is_neutralizable=True)
    t2 = Molecule.objects.create(name="toxin b", harm_level=3, is_neutralizable=True)
    FoodMolecule.objects.create(food=food, molecule=t1, is_beneficial=False)
    FoodMolecule.objects.create(food=food, molecule=t2, is_beneficial=False)

    score = compute_safety_score(food)
    # t1=4→20, t2=3→10, total=30, synergy 0.8x → 56
    assert score == 56
