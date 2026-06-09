import pytest

from core.models import Study
from scripts.report_ingestion_counts import collect_counts, diff_counts


@pytest.mark.django_db
def test_collect_counts_only_counts_nonblank_ai_summaries_as_analyzed():
    Study.objects.create(pmid="910002", title="Blank summary", ai_summary="")
    Study.objects.create(pmid="910003", title="Analyzed", ai_summary="Reviewed by AI.")

    counts = collect_counts()

    assert counts["studies"] == 2
    assert counts["studies_analyzed"] == 1


def test_diff_counts_ignores_non_integer_fields():
    before = {"captured_at": "before", "foods": 2, "studies": 5}
    after = {"captured_at": "after", "foods": 7, "studies": 4}

    assert diff_counts(before, after) == {"foods": 5, "studies": -1}
