import uuid
from datetime import datetime, timezone as dt_timezone

import pytest
from rest_framework.test import APIRequestFactory

from core.models import Food, FoodStudy, Molecule, Study
from core.views import (
    BanListView,
    FoodGuideView,
    FoodHealthIndexView,
    FoodListView,
    FoodSearchView,
    FoodStudiesView,
    MoleculeListView,
    MoleculeSearchView,
    RecentStudiesView,
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
@pytest.mark.parametrize(
    ("view", "path"),
    [
        (FoodListView, "/api/v1/foods/"),
        (FoodSearchView, "/api/v1/foods/search/"),
        (MoleculeListView, "/api/v1/molecules/"),
        (MoleculeSearchView, "/api/v1/molecules/search/"),
    ],
)
def test_search_queries_reject_excessive_length(view, path):
    response = _get(view, f"{path}?q={'a' * 129}")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'q' must be at most 128 characters."


@pytest.mark.django_db
@pytest.mark.parametrize("param", ["min_health_index", "max_health_index", "max_hazard_level"])
def test_food_list_rejects_invalid_integer_filters(param):
    response = _get(FoodListView, f"/api/v1/foods/?{param}=bad")

    assert response.status_code == 400
    assert response.data["detail"] == f"Query parameter '{param}' must be an integer."


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("param", "value", "detail"),
    [
        ("min_health_index", "-1", "Query parameter 'min_health_index' must be at least 0."),
        ("max_health_index", "101", "Query parameter 'max_health_index' must be at most 100."),
        ("max_hazard_level", "6", "Query parameter 'max_hazard_level' must be at most 5."),
    ],
)
def test_food_list_rejects_out_of_range_numeric_filters(param, value, detail):
    response = _get(FoodListView, f"/api/v1/foods/?{param}={value}")

    assert response.status_code == 400
    assert response.data["detail"] == detail


@pytest.mark.django_db
def test_food_list_rejects_excessive_category_filter_length():
    response = _get(FoodListView, f"/api/v1/foods/?category={'a' * 101}")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'category' must be at most 100 characters."


@pytest.mark.django_db
def test_food_list_rejects_excessive_dietary_preference_filter_length():
    response = _get(FoodListView, f"/api/v1/foods/?dietary_preferences={'a' * 101}")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'dietary_preferences' values must be at most 100 characters."


@pytest.mark.django_db
def test_food_list_rejects_excessive_dietary_preference_count():
    preferences = ",".join(f"pref{i}" for i in range(21))

    response = _get(FoodListView, f"/api/v1/foods/?dietary_preferences={preferences}")

    assert response.status_code == 400
    assert response.data["detail"] == "Query parameter 'dietary_preferences' must include at most 20 values."


@pytest.mark.django_db
@pytest.mark.parametrize("param", ["harm_level", "max_harm_level"])
def test_molecule_list_rejects_invalid_integer_filters(param):
    response = _get(MoleculeListView, f"/api/v1/molecules/?{param}=bad")

    assert response.status_code == 400
    assert response.data["detail"] == f"Query parameter '{param}' must be an integer."


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("param", "value", "detail"),
    [
        ("harm_level", "-1", "Query parameter 'harm_level' must be at least 0."),
        ("harm_level", "6", "Query parameter 'harm_level' must be at most 5."),
        ("max_harm_level", "-1", "Query parameter 'max_harm_level' must be at least 0."),
        ("max_harm_level", "6", "Query parameter 'max_harm_level' must be at most 5."),
    ],
)
def test_molecule_list_rejects_out_of_range_harm_filters(param, value, detail):
    response = _get(MoleculeListView, f"/api/v1/molecules/?{param}={value}")

    assert response.status_code == 400
    assert response.data["detail"] == detail


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


@pytest.mark.django_db
def test_recent_studies_orders_analyzed_items_before_undated_summaries():
    undated = Study.objects.create(pmid="990001", title="Undated summary", publication_year=2026, ai_summary="done")
    older = Study.objects.create(
        pmid="990002",
        title="Older summary",
        publication_year=2024,
        ai_summary="done",
        analyzed_at=datetime(2025, 1, 1, tzinfo=dt_timezone.utc),
    )
    newer = Study.objects.create(
        pmid="990003",
        title="Newer summary",
        publication_year=2023,
        ai_summary="done",
        analyzed_at=datetime(2026, 1, 1, tzinfo=dt_timezone.utc),
    )
    Study.objects.create(pmid="990004", title="Blank summary", ai_summary="")

    response = _get(RecentStudiesView, "/api/v1/studies/recent/")
    results = response.data["results"] if isinstance(response.data, dict) else response.data

    assert response.status_code == 200
    assert [item["id"] for item in results] == [str(newer.id), str(older.id), str(undated.id)]


@pytest.mark.django_db
def test_food_studies_orders_analyzed_links_before_undated_links():
    food = Food.objects.create(name="study food")
    undated = Study.objects.create(pmid="990011", title="Undated linked", publication_year=2026)
    older = Study.objects.create(
        pmid="990012",
        title="Older linked",
        publication_year=2024,
        analyzed_at=datetime(2025, 1, 1, tzinfo=dt_timezone.utc),
    )
    newer = Study.objects.create(
        pmid="990013",
        title="Newer linked",
        publication_year=2023,
        analyzed_at=datetime(2026, 1, 1, tzinfo=dt_timezone.utc),
    )
    for study in (undated, older, newer):
        FoodStudy.objects.create(food=food, study=study)

    response = _get(FoodStudiesView, f"/api/v1/foods/{food.id}/studies/", {"pk": food.id})
    results = response.data["results"] if isinstance(response.data, dict) else response.data

    assert response.status_code == 200
    assert [item["study"]["id"] for item in results] == [str(newer.id), str(older.id), str(undated.id)]
