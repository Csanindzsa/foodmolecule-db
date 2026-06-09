"""
nutrii — PubMed Watcher

Scheduled job (intended to run every 6 hours) that polls PubMed for new
studies related to tracked ingredients, then ingests them into the database.

Usage:
    python scripts/pubmed_watcher.py --days 1
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# Django setup
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from django.db import transaction

from core.models import Food, Molecule, Study
from scripts.fetchers.fetch_pubmed import build_study_entries, search_studies


def get_all_search_terms() -> list[tuple[str, list[Food] | None]]:
    """Build PubMed search queries and preserve known food links.

    Food searches keep the originating Food object so newly ingested studies can
    be linked through FoodStudy immediately. Molecule-only searches are still
    useful for discovery, but they are not linked to foods until AI/fuzzy
    cross-reference logic exists.
    """
    terms: list[tuple[str, list[Food] | None]] = []
    for food in Food.objects.all():
        aliases = " OR ".join(f'"{a}"' for a in [food.name, *food.aliases] if a)
        if aliases:
            terms.append((f"({aliases})[Title/Abstract]", [food]))
    for mol in Molecule.objects.exclude(name=""):
        terms.append((f'"{mol.name}"[Title/Abstract]', None))
    return terms


def ingest_studies(entries: list, linked_foods: list[Food] | None = None) -> list[Study]:
    """Insert or update Study records and link them to foods."""
    created = []
    with transaction.atomic():
        for entry in entries:
            study, was_created = Study.objects.update_or_create(
                pmid=entry.pmid,
                defaults={
                    "title": entry.title,
                    "authors": entry.authors,
                    "journal": entry.journal,
                    "publication_year": entry.publication_year,
                    "url": entry.url,
                    "abstract": entry.abstract,
                },
            )
            if was_created:
                created.append(study)
            if linked_foods:
                for food in linked_foods:
                    study.foodstudy_set.get_or_create(food=food)
    return created


def link_existing_studies(pmids: set[str], linked_foods: list[Food] | None) -> int:
    """Link already-ingested PubMed studies to the foods that produced a query."""
    if not pmids or not linked_foods:
        return 0

    linked = 0
    with transaction.atomic():
        for study in Study.objects.filter(pmid__in=pmids):
            for food in linked_foods:
                _, was_created = study.foodstudy_set.get_or_create(food=food)
                if was_created:
                    linked += 1
    return linked


def run_watcher(days: int = 1, max_results_per_query: int = 20) -> dict:
    """Poll PubMed and ingest new studies."""
    terms = get_all_search_terms()
    if not terms:
        print("No foods/molecules in database yet. Skipping watch.")
        return {"ingested": 0, "queries": 0, "linked": 0}

    total_ingested = 0
    total_linked = 0
    queries_run = 0

    # Limit to top 50 terms to avoid NCBI rate limits
    for term, linked_foods in terms[:50]:
        pmids = search_studies(term, max_results=max_results_per_query, days=days)
        queries_run += 1
        if not pmids:
            continue

        # Filter out already-known PMIDs
        known_pmids = set(
            Study.objects.filter(pmid__in=pmids).values_list("pmid", flat=True)
        )
        total_linked += link_existing_studies(known_pmids, linked_foods)
        new_pmids = [p for p in pmids if p not in known_pmids]

        if not new_pmids:
            continue

        entries = build_study_entries(new_pmids)
        created = ingest_studies(entries, linked_foods=linked_foods)
        total_ingested += len(created)

    return {"ingested": total_ingested, "queries": queries_run, "linked": total_linked}


def main():
    parser = argparse.ArgumentParser(description="Poll PubMed for new studies")
    parser.add_argument("--days", type=int, default=1, help="Look back N days")
    parser.add_argument("--max-results", type=int, default=20, help="Max results per query")
    args = parser.parse_args()

    print(f"[{datetime.utcnow().isoformat()}] PubMed watcher starting (last {args.days} days)")
    result = run_watcher(days=args.days, max_results_per_query=args.max_results)
    print(
        f"[{datetime.utcnow().isoformat()}] Queries: {result['queries']}, "
        f"New studies: {result['ingested']}, Linked existing studies: {result['linked']}"
    )


if __name__ == "__main__":
    main()
