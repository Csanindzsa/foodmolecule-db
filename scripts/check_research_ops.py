"""Validate static PubMed/AI research operations wiring."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PUBMED_PASSES = 3
DEFAULT_PUBMED_DAYS = 365
DEFAULT_PUBMED_MAX_RESULTS = 10
DEFAULT_STUDY_ANALYZER_LIMIT = 25


@dataclass(frozen=True)
class ResearchCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _default_value(source: str, name: str) -> str | None:
    match = re.search(rf'{re.escape(name)}="\$\{{{re.escape(name)}:-(.*?)\}}"', source)
    return match.group(1) if match else None


def _script_checks(script_name: str, source: str) -> list[ResearchCheck]:
    return [
        ResearchCheck(
            f"{script_name}:pubmed-default-passes",
            _default_value(source, "PUBMED_PASSES") == str(DEFAULT_PUBMED_PASSES),
            f"PUBMED_PASSES default must be {DEFAULT_PUBMED_PASSES}",
        ),
        ResearchCheck(
            f"{script_name}:pubmed-default-days",
            _default_value(source, "PUBMED_DAYS") == str(DEFAULT_PUBMED_DAYS),
            f"PUBMED_DAYS default must be {DEFAULT_PUBMED_DAYS}",
        ),
        ResearchCheck(
            f"{script_name}:pubmed-default-results",
            _default_value(source, "PUBMED_MAX_RESULTS") == str(DEFAULT_PUBMED_MAX_RESULTS),
            f"PUBMED_MAX_RESULTS default must be {DEFAULT_PUBMED_MAX_RESULTS}",
        ),
        ResearchCheck(
            f"{script_name}:pubmed-command",
            "scripts/pubmed_watcher.py" in source
            and '--days "$PUBMED_DAYS"' in source
            and '--max-results "$PUBMED_MAX_RESULTS"' in source,
            "runner must call pubmed_watcher.py with configured days/results",
        ),
        ResearchCheck(
            f"{script_name}:ai-key-gate",
            "OPENROUTER_API_KEY" in source
            and "OPENROUTER_API_KEYS" in source
            and "OPENCODE_GO_API_KEY" in source
            and "OPENCODE_GO_API_KEYS" in source,
            "runner must gate AI steps on configured provider keys",
        ),
        ResearchCheck(
            f"{script_name}:study-analysis",
            _default_value(source, "STUDY_ANALYZER_LIMIT") == str(DEFAULT_STUDY_ANALYZER_LIMIT)
            and "scripts/study_analyzer.py --limit" in source,
            f"runner must call study_analyzer.py with default limit {DEFAULT_STUDY_ANALYZER_LIMIT}",
        ),
        ResearchCheck(
            f"{script_name}:safety-adjustment",
            "scripts/safety_adjuster.py --auto" in source,
            "runner must call safety_adjuster.py --auto after study analysis",
        ),
        ResearchCheck(
            f"{script_name}:post-pubmed-counts",
            "counts_post_pubmed.json" in source and "--label post-pubmed" in source,
            "runner must capture post-PubMed counts",
        ),
    ]


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[ResearchCheck, ...]:
    overnight = _read(project_root / "scripts" / "overnight_ingestion.sh")
    continuation = _read(project_root / "scripts" / "continue_overnight_ingestion.sh")
    pubmed = _read(project_root / "scripts" / "pubmed_watcher.py")
    analyzer = _read(project_root / "scripts" / "study_analyzer.py")
    adjuster = _read(project_root / "scripts" / "safety_adjuster.py")
    runbook = _read(project_root / "docs" / "overnight_ingestion_runbook.md")

    checks: list[ResearchCheck] = []
    checks.extend(_script_checks("overnight", overnight))
    checks.extend(_script_checks("continue", continuation))
    checks.extend([
        ResearchCheck(
            "pubmed-watcher-food-links",
            "FoodStudy" in pubmed or "foodstudy_set.get_or_create" in pubmed,
            "PubMed watcher must link food-originated studies through FoodStudy",
        ),
        ResearchCheck(
            "study-analyzer-dispatch",
            '"study_analysis"' in analyzer and "OpenRouterDispatcher" in analyzer,
            "study analyzer must dispatch study_analysis through OpenRouterDispatcher",
        ),
        ResearchCheck(
            "safety-adjuster-delta-cap",
            "MAX_DELTA = 15" in adjuster and "SafetyScoreRevision" in adjuster,
            "safety adjuster must enforce the 15-point cap and write revisions",
        ),
        ResearchCheck(
            "runbook-cron-guidance",
            "every 6h" in runbook and "tmux" in runbook and "PubMed watcher" in runbook,
            "runbook must document cron cadence and tmux handoff",
        ),
    ])
    return tuple(checks)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static PubMed/AI research operations wiring.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-cron\tverify the production cron job in the scheduler after deploy")
    print("skip\tai-provider-quota\tverify OpenRouter quota in the provider dashboard")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
