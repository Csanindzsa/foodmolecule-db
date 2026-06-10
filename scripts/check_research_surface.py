"""Validate static PubMed/AI research UI surfacing."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ResearchSurfaceCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[ResearchSurfaceCheck, ...]:
    food_detail = _read(project_root / "web" / "src" / "pages" / "FoodDetail.tsx")
    research_page = _read(project_root / "web" / "src" / "pages" / "Research.tsx")
    web_api = _read(project_root / "web" / "src" / "lib" / "api.ts")
    web_hooks = _read(project_root / "web" / "src" / "hooks" / "useApi.ts")
    safe_url = _read(project_root / "web" / "src" / "lib" / "safeUrl.ts")
    types = _read(project_root / "web" / "src" / "types" / "index.ts")
    serializers = _read(project_root / "backend" / "core" / "serializers.py")
    runbook = _read(project_root / "docs" / "research_surface_checks.md")

    return (
        ResearchSurfaceCheck(
            "study-api-fields",
            '"url"' in serializers
            and '"ai_summary"' in serializers
            and '"ai_confidence"' in serializers
            and '"publication_year"' in serializers,
            "StudySerializer must expose URL, summary, confidence, and publication year fields",
        ),
        ResearchSurfaceCheck(
            "study-web-types",
            "url: string" in types
            and "ai_summary: string | null" in types
            and 'ai_confidence: "high" | "medium" | "low" | null' in types,
            "web Study type must carry citation URL and AI summary/confidence fields",
        ),
        ResearchSurfaceCheck(
            "food-detail-research-section",
            "Latest Research" in food_detail
            and "visibleStudies = studies?.slice(0, 5) ?? []" in food_detail
            and "visibleStudies.map" in food_detail
            and "s.ai_summary" in food_detail,
            "food detail must render the latest study cards with AI summaries",
        ),
        ResearchSurfaceCheck(
            "recent-research-api-hook",
            'recentStudies: () => fetcher<{ results: Study[] }>("/studies/recent/")' in web_api
            and "useRecentStudies" in web_hooks
            and 'queryKey: ["studies", "recent"]' in web_hooks,
            "web API client and hook must expose recent AI-analyzed studies",
        ),
        ResearchSurfaceCheck(
            "recent-research-page",
            "useRecentStudies" in research_page
            and "Latest Research" in research_page
            and "AI-analyzed PubMed studies" in research_page
            and "study.ai_summary" in research_page,
            "standalone research page must render recent PubMed study summaries",
        ),
        ResearchSurfaceCheck(
            "pubmed-citation-link",
            "s.url" in food_detail
            and "study.url" in research_page
            and "externalHttpUrl" in safe_url
            and "externalHttpUrl(s.url)" in food_detail
            and "externalHttpUrl(study.url)" in research_page
            and "href={citationUrl}" in food_detail
            and "href={citationUrl}" in research_page
            and 'target="_blank"' in food_detail
            and 'target="_blank"' in research_page
            and 'rel="noreferrer"' in food_detail
            and 'rel="noreferrer"' in research_page,
            "research surfaces must link PMID citations through an HTTP(S)-only external URL sanitizer",
        ),
        ResearchSurfaceCheck(
            "study-context-visible",
            "s.publication_year" in food_detail
            and "s.ai_confidence" in food_detail
            and "study.publication_year" in research_page
            and "study.ai_confidence" in research_page
            and "PMID:" in food_detail
            and "PMID:" in research_page,
            "study cards must keep PMID, publication year, and AI confidence visible",
        ),
        ResearchSurfaceCheck(
            "research-surface-runbook",
            "python scripts/check_research_surface.py" in runbook
            and "PubMed citation links" in runbook
            and "AI summaries" in runbook,
            "research surface runbook must document the static contract",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static PubMed/AI research UI surfacing.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-pubmed-links\tverify deployed citation links after production data is seeded")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
