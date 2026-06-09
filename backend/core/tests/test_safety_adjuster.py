from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace

import pytest

from core.models import Food, FoodStudy, Study
from scripts import safety_adjuster


class FakeDispatcher:
    last_model_used = "test-model"

    def __init__(self, result, calls):
        self.result = result
        self.calls = calls
        self.selector = SimpleNamespace(pick_best_model=lambda task: "fallback-model")

    def dispatch(self, task_type, template_vars):
        self.calls.append((task_type, template_vars))
        return self.result


@pytest.mark.django_db
def test_propose_adjustment_preserves_zero_scores(monkeypatch):
    calls = []
    result = SimpleNamespace(
        new_safety_score=12,
        new_health_index=10,
        reasoning="Evidence supports a small increase.",
    )
    food = Food.objects.create(name="risky food", overall_safety_score=0, health_index=0)
    study = Study.objects.create(
        pmid="990001",
        title="Risky food study",
        abstract="",
        ai_summary="Relevant analyzed summary.",
    )

    monkeypatch.setattr(
        safety_adjuster,
        "OpenRouterDispatcher",
        lambda: FakeDispatcher(result, calls),
    )

    revision = safety_adjuster.propose_adjustment(food, study)

    assert calls[0][1]["current_safety_score"] == 0
    assert calls[0][1]["current_health_index"] == 0
    assert revision.old_safety_score == 0
    assert revision.old_health_index == 0
    assert revision.new_safety_score == 12
    assert revision.new_health_index == 10


@pytest.mark.django_db
def test_propose_adjustment_defaults_missing_scores_to_neutral(monkeypatch):
    calls = []
    result = SimpleNamespace(
        new_safety_score=80,
        new_health_index=20,
        reasoning="Large requested jump should be capped from neutral.",
    )
    food = Food.objects.create(name="unscored food", overall_safety_score=None, health_index=None)
    study = Study.objects.create(
        pmid="990002",
        title="Unscored food study",
        abstract="",
        ai_summary="Relevant analyzed summary.",
    )

    monkeypatch.setattr(
        safety_adjuster,
        "OpenRouterDispatcher",
        lambda: FakeDispatcher(result, calls),
    )

    revision = safety_adjuster.propose_adjustment(food, study)

    assert calls[0][1]["current_safety_score"] == 50
    assert calls[0][1]["current_health_index"] == 50
    assert revision.old_safety_score == 50
    assert revision.old_health_index == 50
    assert revision.new_safety_score == 65
    assert revision.new_health_index == 35


@pytest.mark.django_db
def test_get_recent_studies_orders_analyzed_before_undated_summaries():
    food = Food.objects.create(name="study food")
    undated = Study.objects.create(
        pmid="990101",
        title="Undated summary",
        publication_year=2026,
        ai_summary="done",
    )
    older = Study.objects.create(
        pmid="990102",
        title="Older summary",
        publication_year=2024,
        ai_summary="done",
        analyzed_at=datetime(2025, 1, 1, tzinfo=dt_timezone.utc),
    )
    newer = Study.objects.create(
        pmid="990103",
        title="Newer summary",
        publication_year=2023,
        ai_summary="done",
        analyzed_at=datetime(2026, 1, 1, tzinfo=dt_timezone.utc),
    )
    blank = Study.objects.create(
        pmid="990104",
        title="Blank summary",
        publication_year=2027,
        ai_summary="",
    )
    for study in (undated, older, newer, blank):
        FoodStudy.objects.create(food=food, study=study)

    studies = safety_adjuster.get_recent_studies(food, n=5)

    assert studies == [newer, older, undated]
