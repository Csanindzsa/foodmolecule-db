"""Tests for backend food name normalization and duplicate filtering."""

import pytest
from rest_framework.test import APIRequestFactory

from core.models import Food, FoodMolecule, Molecule
from core.views import FoodListView


@pytest.mark.parametrize(
    ("raw_name", "expected"),
    [
        ("oranges, raw, all commercial varieties", "orange"),
        ("beef, tenderloin, no bone, cow", "beef tenderloin"),
        ("beef tenderloin boneless", "beef tenderloin"),
        ("Apples, raw, granny smith, with skin", "apple granny smith"),
    ],
)
def test_normalize_food_name_removes_usda_noise_and_species_synonyms(raw_name, expected):
    from core.food_deduplication import normalize_food_name

    assert normalize_food_name(raw_name) == expected


@pytest.mark.django_db
def test_dedupe_foods_by_molecule_signature_keeps_one_representative_for_exact_profile():
    from core.food_deduplication import dedupe_foods_by_molecule_signature

    vitamin_c = Molecule.objects.create(name="Vitamin C")
    water = Molecule.objects.create(name="Water")

    orange = Food.objects.create(name="oranges, raw, all commercial varieties", health_index=81)
    orange_duplicate = Food.objects.create(name="orange, raw", health_index=80)
    orange_juice = Food.objects.create(name="orange juice, raw", health_index=72)

    for food in (orange, orange_duplicate):
        FoodMolecule.objects.create(food=food, molecule=vitamin_c, amount_per_100g="53.200000", unit="mg")
        FoodMolecule.objects.create(food=food, molecule=water, amount_per_100g="86.750000", unit="g")

    FoodMolecule.objects.create(food=orange_juice, molecule=vitamin_c, amount_per_100g="50.000000", unit="mg")
    FoodMolecule.objects.create(food=orange_juice, molecule=water, amount_per_100g="88.300000", unit="g")

    deduped = dedupe_foods_by_molecule_signature(
        Food.objects.prefetch_related("foodmolecule_set__molecule").all()
    )

    names = [food.name for food in deduped]
    assert names == ["oranges, raw, all commercial varieties", "orange juice, raw"]


@pytest.mark.django_db
def test_food_list_view_can_filter_duplicate_exact_ingredient_profiles_without_frontend_changes():
    vitamin_c = Molecule.objects.create(name="Vitamin C")
    water = Molecule.objects.create(name="Water")

    apple = Food.objects.create(name="apples, raw, granny smith, with skin", health_index=90)
    apple_duplicate = Food.objects.create(name="apple, granny smith, raw", health_index=89)
    apple_different = Food.objects.create(name="apple juice, raw", health_index=70)

    for food in (apple, apple_duplicate):
        FoodMolecule.objects.create(food=food, molecule=vitamin_c, amount_per_100g="4.600000", unit="mg")
        FoodMolecule.objects.create(food=food, molecule=water, amount_per_100g="85.560000", unit="g")

    FoodMolecule.objects.create(food=apple_different, molecule=vitamin_c, amount_per_100g="0.900000", unit="mg")
    FoodMolecule.objects.create(food=apple_different, molecule=water, amount_per_100g="88.240000", unit="g")

    request = APIRequestFactory().get("/foods/?dedupe=ingredient_signature")
    response = FoodListView.as_view()(request)

    data = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
    names = [food["name"] for food in data]
    assert names == ["apples, raw, granny smith, with skin", "apple juice, raw"]
