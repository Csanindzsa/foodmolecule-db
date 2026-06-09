import pytest

from core.models import Food, FoodStudy, Molecule, Study
from scripts.pipeline.models import StudyEntry
from scripts import pubmed_watcher


@pytest.mark.django_db
def test_run_watcher_links_existing_studies_for_food_queries(monkeypatch):
    food = Food.objects.create(name="spinach")
    existing = Study.objects.create(pmid="11111111", title="Spinach nitrate study")

    monkeypatch.setattr(
        pubmed_watcher,
        "search_studies",
        lambda term, max_results, days: ["11111111"],
    )
    monkeypatch.setattr(pubmed_watcher, "build_study_entries", lambda pmids: [])

    result = pubmed_watcher.run_watcher(days=7, max_results_per_query=5)

    assert result == {"ingested": 0, "queries": 1, "linked": 1}
    assert FoodStudy.objects.get(food=food, study=existing)


@pytest.mark.django_db
def test_run_watcher_counts_queries_that_return_no_new_studies(monkeypatch):
    Food.objects.create(name="apple")
    Molecule.objects.create(name="fiber")

    monkeypatch.setattr(
        pubmed_watcher,
        "search_studies",
        lambda term, max_results, days: [],
    )
    monkeypatch.setattr(pubmed_watcher, "build_study_entries", lambda pmids: [])

    result = pubmed_watcher.run_watcher(days=1, max_results_per_query=20)

    assert result == {"ingested": 0, "queries": 2, "linked": 0}


@pytest.mark.django_db
def test_run_watcher_ingests_and_links_new_food_studies(monkeypatch):
    food = Food.objects.create(name="lentil")

    monkeypatch.setattr(
        pubmed_watcher,
        "search_studies",
        lambda term, max_results, days: ["22222222"],
    )
    monkeypatch.setattr(
        pubmed_watcher,
        "build_study_entries",
        lambda pmids: [
            StudyEntry(
                pmid=pmids[0],
                title="Lentil polyphenol trial",
                authors=["A Researcher"],
                publication_year=2025,
                url="https://pubmed.ncbi.nlm.nih.gov/22222222/",
                abstract="Dietary lentils were studied.",
            )
        ],
    )

    result = pubmed_watcher.run_watcher(days=30, max_results_per_query=10)

    study = Study.objects.get(pmid="22222222")
    assert result == {"ingested": 1, "queries": 1, "linked": 0}
    assert study.title == "Lentil polyphenol trial"
    assert FoodStudy.objects.get(food=food, study=study)
