from types import SimpleNamespace

import pytest

from core.models import Food, Molecule, Study
from scripts import study_analyzer
from scripts.study_analyzer import find_relevant_ingredient


class FakeStudyDispatcher:
    last_model_used = "test-model"

    def __init__(self, calls):
        self.calls = calls
        self.selector = SimpleNamespace(pick_best_model=lambda task: "fallback-model")

    def dispatch(self, task_type, template_vars):
        self.calls.append((task_type, template_vars))
        return SimpleNamespace(
            summary="Analyzed summary.",
            safety_impact=-2,
            health_impact=-1,
            confidence="medium",
        )


@pytest.mark.django_db
def test_find_relevant_ingredient_does_not_match_inside_larger_words():
    Molecule.objects.create(name="iron")
    study = Study.objects.create(
        pmid="900001",
        title="Effects of ironing methods on fabric temperature",
        abstract="No nutritional ingredient exposure was measured.",
    )

    assert find_relevant_ingredient(study) is None


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_bounded_molecule_name():
    molecule = Molecule.objects.create(name="iron")
    study = Study.objects.create(
        pmid="900002",
        title="Dietary iron absorption in adults",
        abstract="A controlled feeding study.",
    )

    assert find_relevant_ingredient(study) == molecule


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_food_alias_phrase():
    food = Food.objects.create(name="apple", aliases=["malus domestica"])
    study = Study.objects.create(
        pmid="900003",
        title="Malus domestica peel polyphenols and oxidative stress",
        abstract="Apple-derived compounds were evaluated.",
    )

    assert find_relevant_ingredient(study) == food


@pytest.mark.django_db
def test_find_relevant_ingredient_matches_multiword_terms_with_variable_spacing():
    molecule = Molecule.objects.create(name="green tea")
    study = Study.objects.create(
        pmid="900004",
        title="Green   tea catechins and cardiometabolic markers",
        abstract="",
    )

    assert find_relevant_ingredient(study) == molecule


@pytest.mark.django_db
def test_analyze_study_preserves_zero_food_scores_in_prompt(monkeypatch):
    calls = []
    Food.objects.create(name="risky food", overall_safety_score=0, health_index=0)
    study = Study.objects.create(
        pmid="900005",
        title="Risky food safety study",
        abstract="Risky food exposure was measured.",
    )

    monkeypatch.setattr(
        study_analyzer,
        "OpenRouterDispatcher",
        lambda: FakeStudyDispatcher(calls),
    )

    assert study_analyzer.analyze_study(study) is True
    study.refresh_from_db()
    assert calls[0][1]["current_safety_score"] == 0
    assert calls[0][1]["current_health_index"] == 0
    assert study.ai_summary == "Analyzed summary."
    assert study.ai_model_used == "test-model"


@pytest.mark.django_db
def test_analyze_study_defaults_missing_food_scores_to_neutral(monkeypatch):
    calls = []
    Food.objects.create(name="unscored food", overall_safety_score=None, health_index=None)
    study = Study.objects.create(
        pmid="900006",
        title="Unscored food safety study",
        abstract="Unscored food exposure was measured.",
    )

    monkeypatch.setattr(
        study_analyzer,
        "OpenRouterDispatcher",
        lambda: FakeStudyDispatcher(calls),
    )

    assert study_analyzer.analyze_study(study) is True
    assert calls[0][1]["current_safety_score"] == 50
    assert calls[0][1]["current_health_index"] == 50
