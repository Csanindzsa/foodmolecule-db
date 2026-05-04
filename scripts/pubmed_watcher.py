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
from datetime import datetime, timedelta
from pathlib import Path

# Django setup
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nutrii.settings")

import django

django.setup()

from django.db import transaction

from core.models import Food, Molecule, Study
from scripts.fetchers.fetch_pubmed import build_study_entries, search_studies


def get_all_search_terms() -> list[str]:
    """Build PubMed search queries for all tracked foods and molecules."""
    terms = []
    for food in Food.objects.all():
        aliases = " OR ".join(f'"{a}"' for a in [food.name, *food.aliases] if a)
        terms.append(f"({aliases})[Title/Abstract]")
    for mol in Molecule.objects.exclude(name=""):
        terms.append(f'"{mol.name}"[Title/Abstract]')
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


def run_watcher(days: int = 1, max_results_per_query: int = 20) -> dict:
    """Poll PubMed and ingest new studies."""
    terms = get_all_search_terms()
    if not terms:
        print("No foods/molecules in database yet. Skipping watch.")
        return {"ingested": 0, "queries": 0}

    total_ingested = 0
    queries_run = 0

    # Limit to top 50 terms to avoid NCBI rate limits
    for term in terms[:50]:
        pmids = search_studies(term, max_results=max_results_per_query, days=days)
        if not pmids:
            continue

        # Filter out already-known PMIDs
        known_pmids = set(
            Study.objects.filter(pmid__in=pmids).values_list("pmid", flat=True)
        )
        new_pmids = [p for p in pmids if p not in known_pmids]

        if not new_pmids:
            continue

        entries = build_study_entries(new_pmids)
        # Link to foods that match this query (best-effort)
        linked_foods = list(Food.objects.filter(name__in=term.lower().split(" or ")))
        created = ingest_studies(entries, linked_foods=linked_foods)
        total_ingested += len(created)
        queries_run += 1

    return {"ingested": total_ingested, "queries": queries_run}


def main():
    parser = argparse.ArgumentParser(description="Poll PubMed for new studies")
    parser.add_argument("--days", type=int, default=1, help="Look back N days")
    parser.add_argument("--max-results", type=int, default=20, help="Max results per query")
    args = parser.parse_args()

    print(f"[{datetime.utcnow().isoformat()}] PubMed watcher starting (last {args.days} days)")
    result = run_watcher(days=args.days, max_results_per_query=args.max_results)
    print(f"[{datetime.utcnow().isoformat()}] Queries: {result['queries']}, New studies: {result['ingested']}")


if __name__ == "__main__":
    main()
