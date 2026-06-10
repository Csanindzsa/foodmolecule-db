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
            and "studies.slice(0, 5)" in food_detail
            and "s.ai_summary" in food_detail,
            "food detail must render the latest study cards with AI summaries",
        ),
        ResearchSurfaceCheck(
            "pubmed-citation-link",
            "s.url" in food_detail
            and 'href={s.url}' in food_detail
            and 'target="_blank"' in food_detail
            and 'rel="noreferrer"' in food_detail,
            "food detail must link PMID citations to external PubMed URLs safely",
        ),
        ResearchSurfaceCheck(
            "study-context-visible",
            "s.publication_year" in food_detail and "s.ai_confidence" in food_detail and "PMID:" in food_detail,
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
