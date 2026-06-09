import pytest
from rest_framework.test import APIRequestFactory

from core.models import Food, FoodMolecule, Molecule
from core.views import FoodCompareView


def _compare(ids: list[str]):
    request = APIRequestFactory().get("/api/v1/foods/compare/", {"ids": ",".join(ids)})
    return FoodCompareView.as_view()(request)


def test_compare_rejects_invalid_uuid_ids():
    response = _compare(["not-a-uuid", "also-bad"])

    assert response.status_code == 400
    assert response.data["detail"] == "All compare IDs must be valid UUIDs."


@pytest.mark.django_db
def test_compare_rejects_duplicate_ids():
    food = Food.objects.create(name="same food")

    response = _compare([str(food.id), str(food.id)])

    assert response.status_code == 400
    assert response.data["detail"] == "Compare IDs must be unique."


@pytest.mark.django_db
def test_compare_preserves_requested_food_order():
    first = Food.objects.create(name="first food")
    second = Food.objects.create(name="second food")
    third = Food.objects.create(name="third food")

    response = _compare([str(second.id), str(third.id), str(first.id)])

    assert response.status_code == 200
    assert [food["id"] for food in response.data["foods"]] == [
        str(second.id),
        str(third.id),
        str(first.id),
    ]
    assert [food["name"] for food in response.data["foods"]] == [
        "second food",
        "third food",
        "first food",
    ]


@pytest.mark.django_db
def test_compare_returns_404_for_missing_valid_uuid():
    existing = Food.objects.create(name="existing food")
    missing = "00000000-0000-0000-0000-000000000000"

    response = _compare([str(existing.id), missing])

    assert response.status_code == 404
    assert response.data["detail"] == "One or more food IDs not found"


@pytest.mark.django_db
def test_compare_returns_shared_molecules_in_deterministic_order():
    apple = Food.objects.create(name="apple")
    pear = Food.objects.create(name="pear")
    zinc = Molecule.objects.create(name="Zinc", harm_level=1)
    fiber = Molecule.objects.create(name="Fiber", harm_level=0)
    water = Molecule.objects.create(name="Water", harm_level=0)

    for food in (apple, pear):
        FoodMolecule.objects.create(food=food, molecule=zinc)
        FoodMolecule.objects.create(food=food, molecule=fiber)
    FoodMolecule.objects.create(food=apple, molecule=water)

    response = _compare([str(apple.id), str(pear.id)])

    assert response.status_code == 200
    assert response.data["shared_molecules"] == ["Fiber", "Zinc"]
