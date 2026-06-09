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
            "_private": "drop",
            "long": "x" * 250,
            "items": list(range(20)),
            "nested": {"raw": "ignored"},
        },
    )

    assert event.metadata["query_length"] == 12
    assert "_private" not in event.metadata
    assert event.metadata["long"] == "x" * 200
    assert event.metadata["items"] == list(range(10))
    assert event.metadata["nested"] == "{'raw': 'ignored'}"


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
