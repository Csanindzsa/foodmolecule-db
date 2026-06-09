"""
Lightweight analytics — privacy-first, aggregate only.
No user IDs, no cookies, no fingerprinting.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from django.http import HttpRequest

logger = logging.getLogger("nutrii.analytics")

ALLOWED_EVENT_TYPES = {"search", "view", "scan", "compare"}
MAX_METADATA_VALUE_LENGTH = 200
ALLOWED_METADATA_KEYS = {
    "search": {"query_length", "food_count", "molecule_count", "dedupe"},
    "scan": {"ingredient_count", "food_count", "molecule_count", "confidence"},
    "compare": {
        "requested_count",
        "matched_count",
        "shared_molecule_count",
        "unique_molecule_count",
    },
    "view": set(),
}


class AnalyticsEvent:
    """Represents a single tracked event."""

    def __init__(
        self,
        event_type: str,  # search, view, scan, compare
        entity_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        if event_type not in ALLOWED_EVENT_TYPES:
            raise ValueError(f"Unsupported analytics event type: {event_type}")
        self.event_type = event_type
        self.entity_id = entity_id
        self.metadata = _sanitize_metadata(event_type, metadata or {})
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def anonymized_ip(self, request: HttpRequest) -> str:
        """Hash IP for daily aggregation without tracking individuals."""
        ip = request.META.get("REMOTE_ADDR", "unknown")
        # Salted hash truncated to 16 chars for daily bucketing
        return hashlib.sha256(f"nutrii-{ip}-{self.timestamp[:10]}".encode()).hexdigest()[:16]

    def to_dict(self) -> dict:
        return {
            "event_type": self.event_type,
            "entity_id": self.entity_id,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
        }


def log_event(event: AnalyticsEvent, request: HttpRequest) -> None:
    """Log a privacy-preserving analytics event."""
    bucket = event.anonymized_ip(request)
    payload = json.dumps({**event.to_dict(), "bucket": bucket})
    logger.info(payload)


def _sanitize_metadata(event_type: str, metadata: dict) -> dict:
    sanitized = {}
    allowed_keys = ALLOWED_METADATA_KEYS[event_type]
    for key, value in metadata.items():
        if not isinstance(key, str) or key not in allowed_keys:
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            sanitized[key] = _truncate(value)
    return sanitized


def _truncate(value):
    if isinstance(value, str):
        return value[:MAX_METADATA_VALUE_LENGTH]
    return value
