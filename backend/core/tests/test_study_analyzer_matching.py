import pytest

from core.models import Food, Molecule, Study
from scripts.study_analyzer import find_relevant_ingredient


@pytest.mark.django_db
def test_find_relevant_ingredient_does_not_match_inside_larger_words():
    Molecule.objects.create(name="iron")
    study = Study.objects.create(
        pmid="900001",
        title="Effects of ironing methods on fabric temperature",
        abstract="No nutritional ingredient exposure was measured.",
    )

    assert find_relevant_ingredient(study) is None


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_bounded_molecule_name():
    molecule = Molecule.objects.create(name="iron")
    study = Study.objects.create(
        pmid="900002",
        title="Dietary iron absorption in adults",
        abstract="A controlled feeding study.",
    )

    assert find_relevant_ingredient(study) == molecule


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_food_alias_phrase():
    food = Food.objects.create(name="apple", aliases=["malus domestica"])
    study = Study.objects.create(
        pmid="900003",
        title="Malus domestica peel polyphenols and oxidative stress",
        abstract="Apple-derived compounds were evaluated.",
    )

    assert find_relevant_ingredient(study) == food


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_multiword_terms_with_variable_spacing():
    molecule = Molecule.objects.create(name="green tea")
    study = Study.objects.create(
        pmid="900004",
        title="Green   tea catechins and cardiometabolic markers",
        abstract="",
    )

    assert find_relevant_ingredient(study) == molecule
