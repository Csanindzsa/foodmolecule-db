import json

import pytest
from django.test import RequestFactory

from core.analytics import AnalyticsEvent, log_event


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
