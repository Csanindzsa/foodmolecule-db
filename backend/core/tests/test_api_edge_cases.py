import uuid

import pytest
from rest_framework.test import APIRequestFactory

from core.models import Food, Molecule
from core.views import (
    BanListView,
    FoodGuideView,
    FoodHealthIndexView,
    FoodListView,
    FoodSearchView,
    FoodStudiesView,
    MoleculeListView,
    MoleculeSearchView,
)


def _get(view, path: str, kwargs=None):
    request = APIRequestFactory().get(path)
    return view.as_view()(request, **(kwargs or {}))


@pytest.mark.django_db
def test_molecule_search_does_not_return_null_pubchem_rows_for_text_query():
    Molecule.objects.create(name="Water", pubchem_cid=None)
    Molecule.objects.create(name="Sodium Chloride", pubchem_cid=5234)

    response = _get(MoleculeSearchView, "/api/v1/molecules/search/?q=banana")

    assert response.status_code == 200
    assert response.data["results"] == []
    assert response.data["count"] == 0


@pytest.mark.django_db
def test_molecule_search_matches_numeric_pubchem_cid():
    molecule = Molecule.objects.create(name="Sodium Chloride", pubchem_cid=5234)

    response = _get(MoleculeSearchView, "/api/v1/molecules/search/?q=5234")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(molecule.id)


@pytest.mark.django_db
@pytest.mark.parametrize("param", ["min_health_index", "max_health_index", "max_hazard_level"])
def test_food_list_rejects_invalid_integer_filters(param):
    response = _get(FoodListView, f"/api/v1/foods/?{param}=bad")

    assert response.status_code == 400
    assert response.data["detail"] == f"Query parameter '{param}' must be an integer."


@pytest.mark.django_db
@pytest.mark.parametrize("param", ["harm_level", "max_harm_level"])
def test_molecule_list_rejects_invalid_integer_filters(param):
    response = _get(MoleculeListView, f"/api/v1/molecules/?{param}=bad")

    assert response.status_code == 400
    assert response.data["detail"] == f"Query parameter '{param}' must be an integer."


@pytest.mark.django_db
def test_food_list_rejects_invalid_sort_mode():
    response = _get(FoodListView, "/api/v1/foods/?sort=unknown")

    assert response.status_code == 400
    assert "Query parameter 'sort' must be one of:" in response.data["detail"]
    assert "safety_desc" in response.data["detail"]


@pytest.mark.django_db
def test_molecule_list_rejects_invalid_sort_mode():
    response = _get(MoleculeListView, "/api/v1/molecules/?sort=unknown")

    assert response.status_code == 400
    assert "Query parameter 'sort' must be one of:" in response.data["detail"]
    assert "name_asc" in response.data["detail"]


@pytest.mark.django_db
def test_food_list_rejects_invalid_dedupe_mode():
    response = _get(FoodListView, "/api/v1/foods/?dedupe=loose")

    assert response.status_code == 400
    assert "Query parameter 'dedupe' must be one of:" in response.data["detail"]
    assert "ingredient_signature" in response.data["detail"]


@pytest.mark.django_db
def test_food_search_rejects_invalid_dedupe_mode():
    response = _get(FoodSearchView, "/api/v1/search/?q=apple&dedupe=loose")

    assert response.status_code == 400
    assert "Query parameter 'dedupe' must be one of:" in response.data["detail"]


@pytest.mark.django_db
def test_food_list_rejects_invalid_ingredient_uuid_filter():
    response = _get(FoodListView, "/api/v1/foods/?ingredients=not-a-uuid")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'ingredients' must contain valid UUIDs."


@pytest.mark.django_db
def test_ban_list_rejects_invalid_conditional_filter():
    response = _get(BanListView, "/api/v1/ban-list/?conditional=maybe")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'conditional' must be true or false."


@pytest.mark.django_db
def test_ban_list_accepts_explicit_false_conditional_filter():
    response = _get(BanListView, "/api/v1/ban-list/?conditional=false")

    assert response.status_code == 200


@pytest.mark.django_db
def test_food_health_index_missing_food_returns_404():
    response = _get(FoodHealthIndexView, "/api/v1/foods/missing/health-index/", {"pk": uuid.uuid4()})

    assert response.status_code == 404


@pytest.mark.django_db
def test_food_studies_missing_food_returns_404():
    response = _get(FoodStudiesView, "/api/v1/foods/missing/studies/", {"pk": uuid.uuid4()})

    assert response.status_code == 404


@pytest.mark.django_db
def test_food_guide_missing_food_returns_404():
    response = _get(FoodGuideView, "/api/v1/foods/missing/guide/", {"pk": uuid.uuid4()})

    assert response.status_code == 404


@pytest.mark.django_db
def test_food_guide_existing_food_without_guide_returns_404_payload():
    food = Food.objects.create(name="no guide food")

    response = _get(FoodGuideView, f"/api/v1/foods/{food.id}/guide/", {"pk": food.id})

    assert response.status_code == 404
    assert response.data == {"food_id": str(food.id), "guide": None}
