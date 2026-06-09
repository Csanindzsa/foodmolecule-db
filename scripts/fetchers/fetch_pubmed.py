"""
nutrii — PubMed Fetcher

Searches PubMed for studies related to food ingredients and fetches metadata.
Outputs pipeline-compatible StudyEntry JSON.

Usage:
    python scripts/fetchers/fetch_pubmed.py --query "spinach toxicity" --max 10
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from xml.etree import ElementTree as ET

import httpx

from scripts.pipeline.config import MAX_RETRIES, NCBI_API_KEY, NCBI_EMAIL, PUBMED_EUTILS_BASE
from scripts.pipeline.models import StudyEntry

MIN_PUBLICATION_YEAR = 1900
MAX_PUBLICATION_YEAR = 2100


def _is_retryable_status(status_code: int) -> bool:
    return status_code == 429 or 500 <= status_code < 600


def _request_with_retries(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    last_exc: httpx.HTTPError | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.get(url, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if not _is_retryable_status(exc.response.status_code) or attempt == MAX_RETRIES:
                raise
        except httpx.HTTPError as exc:
            last_exc = exc
            if attempt == MAX_RETRIES:
                raise
        time.sleep(attempt)

    if last_exc:
        raise last_exc
    raise RuntimeError("PubMed request failed without an exception")


def abstract_text(article: ET.Element) -> str:
    """Return all PubMed abstract sections as one readable string."""
    sections = []
    for abstract_el in article.findall(".//Abstract/AbstractText"):
        text = " ".join(part.strip() for part in abstract_el.itertext() if part and part.strip())
        text = re.sub(r"\s+([,.;:])", r"\1", text)
        if text:
            label = (abstract_el.attrib.get("Label") or "").strip()
            sections.append(f"{label}: {text}" if label else text)
    return "\n".join(sections)


def search_studies(query: str, max_results: int = 10, days: int | None = None) -> list[str]:
    """Search PubMed and return a list of PMIDs."""
    url = f"{PUBMED_EUTILS_BASE}/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
        "sort": "date",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    if days:
        params["reldate"] = days

    with httpx.Client() as client:
        resp = _request_with_retries(client, url, params=params, timeout=30)
        data = resp.json()
        return data.get("esearchresult", {}).get("idlist", [])


def fetch_summaries(pmids: list[str]) -> dict[str, dict]:
    """Fetch article summaries (title, authors, journal, year) for PMIDs."""
    if not pmids:
        return {}

    url = f"{PUBMED_EUTILS_BASE}/esummary.fcgi"
    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "json",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY

    with httpx.Client() as client:
        resp = _request_with_retries(client, url, params=params, timeout=30)
        data = resp.json()
        return data.get("result", {})


def fetch_abstracts(pmids: list[str]) -> dict[str, str]:
    """Fetch abstracts for PMIDs via EFetch."""
    if not pmids:
        return {}

    url = f"{PUBMED_EUTILS_BASE}/efetch.fcgi"
    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "email": NCBI_EMAIL,
    }
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY

    with httpx.Client() as client:
        resp = _request_with_retries(client, url, params=params, timeout=60)
        root = ET.fromstring(resp.text)

    abstracts: dict[str, str] = {}
    for article in root.findall(".//PubmedArticle"):
        pmid_el = article.find(".//PMID")
        if pmid_el is None:
            continue
        pmid = pmid_el.text
        abstracts[pmid] = abstract_text(article)

    return abstracts


def publication_year(pubdate: str) -> int | None:
    """Extract a model-safe publication year from a PubMed summary date."""
    year = pubdate[:4]
    if not year.isdigit():
        return None

    parsed = int(year)
    if MIN_PUBLICATION_YEAR <= parsed <= MAX_PUBLICATION_YEAR:
        return parsed
    return None


def build_study_entries(pmids: list[str]) -> list[StudyEntry]:
    """Fetch metadata and build StudyEntry objects."""
    summaries = fetch_summaries(pmids)
    abstracts = fetch_abstracts(pmids)

    entries = []
    for pmid in pmids:
        info = summaries.get(pmid, {})
        if not info or isinstance(info, list):  # skip 'uids' key
            continue

        authors = []
        for author in info.get("authors", []):
            name = author.get("name", "")
            if name:
                authors.append(name)

        entries.append(
            StudyEntry(
                pmid=pmid,
                title=info.get("title", ""),
                authors=authors,
                journal=info.get("fulljournalname", info.get("source", "")),
                publication_year=publication_year(info.get("pubdate", "")),
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                abstract=abstracts.get(pmid, ""),
            )
        )

    return entries


def main():
    parser = argparse.ArgumentParser(description="Fetch studies from PubMed")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--max", type=int, default=10, help="Max results")
    parser.add_argument("--days", type=int, help="Limit to last N days")
    parser.add_argument("--output", type=Path, default=Path("data/seed/studies"), help="Output directory")
    args = parser.parse_args()

    print(f"Searching PubMed for: {args.query}")
    pmids = search_studies(args.query, max_results=args.max, days=args.days)
    print(f"Found {len(pmids)} PMIDs")

    if not pmids:
        return

    entries = build_study_entries(pmids)
    args.output.mkdir(parents=True, exist_ok=True)

    for entry in entries:
        path = args.output / f"pmid_{entry.pmid}.json"
        with open(path, "w") as f:
            json.dump(entry.model_dump(mode="json"), f, indent=2)
        print(f"  Saved: {path}")

    print(f"Downloaded {len(entries)} study summaries.")


if __name__ == "__main__":
    main()
