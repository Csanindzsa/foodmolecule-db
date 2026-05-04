"""
Lightweight analytics — privacy-first, aggregate only.
No user IDs, no cookies, no fingerprinting.
"""

import hashlib
import json
from datetime import datetime
from typing import Optional

from django.http import HttpRequest


class AnalyticsEvent:
    """Represents a single tracked event."""

    def __init__(
        self,
        event_type: str,  # search, view, scan, compare
        entity_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        self.event_type = event_type
        self.entity_id = entity_id
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow().isoformat()

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
    """
    Log an analytics event.
    TODO: In production, send to ClickHouse/PostHog/Plausible instead of print.
    """
    bucket = event.anonymized_ip(request)
    payload = json.dumps({**event.to_dict(), "bucket": bucket})
    # For now, just log. Replace with async queue (Redis + Celery) when scaling.
    print(f"[ANALYTICS] {payload}")
