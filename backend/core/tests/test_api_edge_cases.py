import uuid

import pytest
from rest_framework.test import APIRequestFactory

from core.models import Food, Molecule
from core.views import FoodGuideView, FoodHealthIndexView, FoodStudiesView, MoleculeSearchView


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
