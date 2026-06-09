import pytest

from core.models import Food, IngredientAIGuide
from scripts import generate_guides


@pytest.mark.django_db
def test_run_generator_skips_foods_that_already_have_guides(monkeypatch):
    food = Food.objects.create(name="apple")
    IngredientAIGuide.objects.create(
        food=food,
        guide_markdown="existing guide",
        version=1,
        generated_by="test",
    )
    called = False

    def fake_generate_guide(food):
        nonlocal called
        called = True
        return "new guide", "test-model"

    monkeypatch.setattr(generate_guides, "generate_guide", fake_generate_guide)

    result = generate_guides.run_generator()

    assert result == {"created": 0}
    assert called is False
    assert food.ai_guides.count() == 1


@pytest.mark.django_db
def test_run_generator_force_creates_next_guide_version(monkeypatch, tmp_path):
    food = Food.objects.create(name="Apple / Pear")
    IngredientAIGuide.objects.create(
        food=food,
        guide_markdown="existing guide",
        version=2,
        generated_by="test",
    )

    monkeypatch.setattr(generate_guides, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(generate_guides, "generate_guide", lambda food: ("new guide", "test-model"))

    result = generate_guides.run_generator(food_id=str(food.id), force=True)

    new_guide = food.ai_guides.order_by("-version").first()
    assert result == {"created": 1}
    assert new_guide.version == 3
    assert new_guide.guide_markdown == "new guide"
    assert (tmp_path / "guides" / "ingredients" / "apple-pear.md").read_text(encoding="utf-8") == "new guide"


@pytest.mark.django_db
def test_run_generator_creates_initial_guides_for_foods_without_guides(monkeypatch, tmp_path):
    food = Food.objects.create(name="Spinach")

    monkeypatch.setattr(generate_guides, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(generate_guides, "generate_guide", lambda food: ("spinach guide", "test-model"))

    result = generate_guides.run_generator()

    guide = food.ai_guides.get()
    assert result == {"created": 1}
    assert guide.version == 1
    assert guide.generated_by == "test-model"
