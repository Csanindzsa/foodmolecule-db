"""
Basic model tests for nutrii.

Phase 2 deliverable — ensures the schema is sound.
"""

import pytest
from django.core.exceptions import ValidationError

from core.models import (
    BanListEntry,
    Food,
    FoodCategory,
    FoodMolecule,
    FoodStudy,
    IngredientAIGuide,
    Molecule,
    MoleculeNeutralization,
    ProcessingMethod,
    SafetyScoreRevision,
    Study,
)


@pytest.mark.django_db
def test_create_food_category():
    cat = FoodCategory.objects.create(name="Vegetables")
    assert cat.name == "Vegetables"
    assert str(cat) == "Vegetables"


@pytest.mark.django_db
def test_create_food():
    food = Food.objects.create(name="Spinach", overall_safety_score=75, health_index=82)
    assert food.name == "Spinach"
    assert food.overall_safety_score == 75
    assert str(food) == "Spinach"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("overall_safety_score", -1),
        ("overall_safety_score", 101),
        ("health_index", -1),
        ("health_index", 101),
    ],
)
def test_food_score_fields_validate_documented_bounds(field, value):
    food = Food(name="Invalid score food", **{field: value})

    with pytest.raises(ValidationError):
        food.full_clean(validate_unique=False, validate_constraints=False)


@pytest.mark.django_db
def test_create_molecule():
    mol = Molecule.objects.create(
        name="Oxalic Acid",
        pubchem_cid=971,
        harm_level=3,
        is_neutralizable=True,
    )
    assert mol.name == "Oxalic Acid"
    assert mol.harm_level == 3


def test_molecule_harm_level_validates_documented_bounds():
    molecule = Molecule(name="Impossible harm molecule", harm_level=6)

    with pytest.raises(ValidationError):
        molecule.full_clean(validate_unique=False, validate_constraints=False)


@pytest.mark.django_db
def test_create_study():
    study = Study.objects.create(pmid="12345678", title="Test Study")
    assert study.pmid == "12345678"
    assert "PMID:12345678" in str(study)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("ai_safety_impact", -6),
        ("ai_safety_impact", 6),
        ("ai_health_impact", -6),
        ("ai_health_impact", 6),
    ],
)
def test_study_ai_impacts_validate_documented_bounds(field, value):
    study = Study(pmid="98765432", title="Invalid impact study", **{field: value})

    with pytest.raises(ValidationError):
        study.full_clean(validate_unique=False, validate_constraints=False)


@pytest.mark.django_db
def test_food_molecule_junction():
    food = Food.objects.create(name="Spinach")
    mol = Molecule.objects.create(name="Iron")
    fm = FoodMolecule.objects.create(
        food=food, molecule=mol, amount_per_100g=2.7, unit="mg"
    )
    assert fm.food == food
    assert fm.molecule == mol


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("reduction_percent_min", -1),
        ("reduction_percent_min", 101),
        ("reduction_percent_max", -1),
        ("reduction_percent_max", 101),
    ],
)
def test_neutralization_reduction_percentages_validate_documented_bounds(field, value):
    molecule = Molecule.objects.create(
        name=f"Invalid reduction molecule {field} {value}"
    )
    method = ProcessingMethod.objects.create(
        name=f"Invalid reduction method {field} {value}"
    )
    neutralization = MoleculeNeutralization(
        molecule=molecule, method=method, **{field: value}
    )

    with pytest.raises(ValidationError):
        neutralization.full_clean(validate_unique=False, validate_constraints=False)


@pytest.mark.django_db
def test_safety_score_revision():
    food = Food.objects.create(name="Spinach")
    rev = SafetyScoreRevision.objects.create(
        food=food,
        old_safety_score=75,
        new_safety_score=70,
        reason="New PubMed study indicates higher kidney stone risk.",
        ai_model_used="openai/gpt-4o",
    )
    assert rev.new_safety_score == 70
    assert "Spinach" in str(rev)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("old_safety_score", -1),
        ("old_safety_score", 101),
        ("new_safety_score", -1),
        ("new_safety_score", 101),
        ("old_health_index", -1),
        ("old_health_index", 101),
        ("new_health_index", -1),
        ("new_health_index", 101),
    ],
)
def test_safety_score_revision_scores_validate_documented_bounds(field, value):
    food = Food.objects.create(name=f"Invalid revision food {field} {value}")
    revision = SafetyScoreRevision(
        food=food,
        reason="Invalid score range.",
        ai_model_used="test",
        **{field: value},
    )

    with pytest.raises(ValidationError):
        revision.full_clean(validate_unique=False, validate_constraints=False)


@pytest.mark.django_db
def test_ban_list_entry():
    food = Food.objects.create(name="Puffer Fish (unprepared)")
    ban = BanListEntry.objects.create(
        food=food,
        reason="Contains tetrodotoxin — lethal neurotoxin, heat stable.",
        lethal_dose_mg=1.2,
    )
    assert ban.is_conditionally_safe is False
    assert "BAN: Puffer Fish" in str(ban)
