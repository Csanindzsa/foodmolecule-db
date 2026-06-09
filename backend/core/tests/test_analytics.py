import json
from dataclasses import dataclass
from types import SimpleNamespace

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory

from core.analytics import AnalyticsEvent, log_event
from core.models import Food
from core.views import FoodCompareView, FoodDetailView, FoodSearchView, IngredientScanView


@dataclass
class FakeScanResult:
    ingredients: list[str]
    confidence: float
    raw_text: str


class FakeScanner:
    def scan(self, image_bytes: bytes) -> FakeScanResult:
        return FakeScanResult(
            ingredients=["apple"],
            confidence=91.2,
            raw_text="Ingredients: apple",
        )


class FakeQuerySet(list):
    def select_related(self, *args):
        return self

    def prefetch_related(self, *args):
        return self

    def distinct(self):
        return self

    def __getitem__(self, item):
        result = super().__getitem__(item)
        return FakeQuerySet(result) if isinstance(item, slice) else result


class FakeManager:
    def __init__(self, results):
        self.results = FakeQuerySet(results)

    def none(self):
        return FakeQuerySet()

    def filter(self, *args, **kwargs):
        return self.results


class FakeSerializer:
    def __init__(self, items, many=False):
        self.data = list(items) if many else items


def _capture_view_events(monkeypatch):
    events = []

    def fake_log_event(event, request):
        events.append(event)

    monkeypatch.setattr("core.views.log_event", fake_log_event)
    return events


def test_analytics_event_rejects_unknown_event_type():
    with pytest.raises(ValueError):
        AnalyticsEvent("signup")


def test_analytics_event_sanitizes_metadata():
    event = AnalyticsEvent(
        "search",
        metadata={
            "query_length": 12,
            "food_count": 4,
            "molecule_count": 2,
            "dedupe": True,
            "_private": "drop",
            "raw_query": "spinach kidney stones",
            "long": "x" * 250,
            "items": list(range(20)),
            "nested": {"raw": "ignored"},
        },
    )

    assert event.metadata == {
        "query_length": 12,
        "food_count": 4,
        "molecule_count": 2,
        "dedupe": True,
    }


def test_analytics_event_drops_metadata_not_allowed_for_event_type():
    event = AnalyticsEvent(
        "view",
        metadata={
            "query_length": 12,
            "food_count": 4,
            "raw_path": "/foods/private",
        },
    )

    assert event.metadata == {}


def test_log_event_writes_structured_json(caplog):
    request = RequestFactory().get("/", REMOTE_ADDR="203.0.113.10")
    event = AnalyticsEvent("scan", entity_id="food-1", metadata={"ingredient_count": 3})

    with caplog.at_level("INFO", logger="nutrii.analytics"):
        log_event(event, request)

    payload = json.loads(caplog.records[0].message)
    assert payload["event_type"] == "scan"
    assert payload["entity_id"] == "food-1"
    assert payload["metadata"] == {"ingredient_count": 3}
    assert len(payload["bucket"]) == 16
    assert "203.0.113.10" not in caplog.records[0].message


@pytest.mark.django_db
def test_food_search_emits_aggregate_search_event(monkeypatch):
    events = _capture_view_events(monkeypatch)
    Food.objects.create(name="apple", aliases=["malus"])
    request = APIRequestFactory().get("/api/v1/search/", {"q": "apple"})

    response = FoodSearchView.as_view()(request)

    assert response.status_code == 200
    assert len(events) == 1
    event = events[0]
    assert event.event_type == "search"
    assert event.metadata == {
        "query_length": 5,
        "food_count": 1,
        "molecule_count": 0,
        "dedupe": False,
    }
    assert "apple" not in json.dumps(event.to_dict())


@pytest.mark.django_db
def test_food_detail_emits_view_event(monkeypatch):
    events = _capture_view_events(monkeypatch)
    food = Food.objects.create(name="apple")
    request = APIRequestFactory().get(f"/api/v1/foods/{food.id}/")

    response = FoodDetailView.as_view()(request, pk=food.id)

    assert response.status_code == 200
    assert len(events) == 1
    assert events[0].event_type == "view"
    assert events[0].entity_id == str(food.id)
    assert events[0].metadata == {}


@pytest.mark.django_db
def test_food_compare_emits_aggregate_compare_event(monkeypatch):
    events = _capture_view_events(monkeypatch)
    first = Food.objects.create(name="apple")
    second = Food.objects.create(name="pear")
    request = APIRequestFactory().get(
        "/api/v1/foods/compare/",
        {"ids": f"{first.id},{second.id}"},
    )

    response = FoodCompareView.as_view()(request)

    assert response.status_code == 200
    assert len(events) == 1
    assert events[0].event_type == "compare"
    assert events[0].metadata == {
        "requested_count": 2,
        "matched_count": 2,
        "shared_molecule_count": 0,
        "unique_molecule_count": 0,
    }


@pytest.mark.django_db
def test_scan_emits_aggregate_scan_event(monkeypatch):
    events = _capture_view_events(monkeypatch)
    monkeypatch.setattr("core.views._build_label_scanner", lambda: FakeScanner())
    monkeypatch.setattr("core.views.Food", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.Molecule", SimpleNamespace(objects=FakeManager([])))
    monkeypatch.setattr("core.views.serializers.FoodListSerializer", FakeSerializer)
    monkeypatch.setattr("core.views.serializers.MoleculeSerializer", FakeSerializer)
    image = SimpleUploadedFile("label.jpg", b"image-bytes", content_type="image/jpeg")
    request = APIRequestFactory().post("/api/v1/scan/", {"image": image}, format="multipart")

    response = IngredientScanView.as_view()(request)

    assert response.status_code == 200
    assert len(events) == 1
    assert events[0].event_type == "scan"
    assert events[0].metadata == {
        "ingredient_count": 1,
        "food_count": 0,
        "molecule_count": 0,
        "confidence": 91.2,
    }
    assert "Ingredients: apple" not in json.dumps(events[0].to_dict())
