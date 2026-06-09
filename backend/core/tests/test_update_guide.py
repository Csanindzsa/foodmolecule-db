from types import SimpleNamespace

import pytest

from core.models import Food, IngredientAIGuide, SafetyScoreRevision
from scripts import update_guide


class FakeDispatcher:
    last_model_used = "test-model"

    def __init__(self, result):
        self.result = result
        self.selector = SimpleNamespace(pick_best_model=lambda task: "fallback-model")

    def dispatch(self, task_type, prompt):
        return self.result


@pytest.mark.django_db
def test_update_guide_uses_server_side_next_version(monkeypatch):
    food = Food.objects.create(name="apple")
    IngredientAIGuide.objects.create(
        food=food,
        guide_markdown="current guide",
        version=4,
        generated_by="test",
    )
    revision = SafetyScoreRevision.objects.create(
        food=food,
        old_safety_score=50,
        new_safety_score=55,
        reason="New evidence.",
    )
    result = SimpleNamespace(markdown_content="updated guide", version=99)
    monkeypatch.setattr(update_guide, "OpenRouterDispatcher", lambda: FakeDispatcher(result))

    guide = update_guide.update_guide(food, revision)

    assert guide.version == 5
    assert guide.guide_markdown == "updated guide"
    assert food.ai_guides.count() == 2


@pytest.mark.django_db
def test_update_guide_does_not_create_new_version_for_unchanged_content(monkeypatch):
    food = Food.objects.create(name="apple")
    current = IngredientAIGuide.objects.create(
        food=food,
        guide_markdown="current guide",
        version=4,
        generated_by="test",
    )
    revision = SafetyScoreRevision.objects.create(
        food=food,
        old_safety_score=50,
        new_safety_score=55,
        reason="New evidence.",
    )
    result = SimpleNamespace(markdown_content=" current guide\n", version=5)
    monkeypatch.setattr(update_guide, "OpenRouterDispatcher", lambda: FakeDispatcher(result))

    guide = update_guide.update_guide(food, revision)

    assert guide == current
    assert food.ai_guides.count() == 1
