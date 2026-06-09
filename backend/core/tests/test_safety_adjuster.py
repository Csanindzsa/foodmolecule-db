from types import SimpleNamespace

import pytest

from core.models import Food, Study
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
