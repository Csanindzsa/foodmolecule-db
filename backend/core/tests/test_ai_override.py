import pytest

from core.ai_override import validate_override
from core.models import Food, Study


@pytest.mark.django_db
def test_validate_override_preserves_stored_zero_scores_for_delta_cap():
    food = Food.objects.create(name="high risk food", overall_safety_score=0, health_index=0)
    study = Study.objects.create(
        pmid="991001",
        title="High risk food randomized trial",
        abstract="A randomized controlled trial in adults measured the food exposure.",
    )

    result = validate_override(
        food=food,
        proposed_safety_score=12,
        proposed_health_index=10,
        triggering_study=study,
        reasoning="Small adjustment supported by PMID: 991001.",
    )

    assert result.accepted is True
    assert result.reason == "All guardrails passed."
