"""Validate static AI prompt, parser, and model-routing contracts."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AI_TASKS = (
    "study_analysis",
    "safety_adjustment",
    "guide_generation",
    "conflict_arbitration",
    "molecule_classification",
)


@dataclass(frozen=True)
class AIContractCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[AIContractCheck, ...]:
    dispatcher = _read(project_root / "ai" / "dispatcher.py")
    parsers = _read(project_root / "ai" / "parsers.py")
    selector = _read(project_root / "ai" / "consensus_selector.py")
    study_analyzer = _read(project_root / "scripts" / "study_analyzer.py")
    safety_adjuster = _read(project_root / "scripts" / "safety_adjuster.py")
    runbook = _read(project_root / "docs" / "ai_contract_checks.md")
    checklist = _read(project_root / "docs" / "launch_checklist.md")
    prompts = {task: _read(project_root / "ai" / "prompts" / f"{task}.j2") for task in AI_TASKS}

    return (
        AIContractCheck(
            "task-map-complete",
            all(f'"{task}"' in dispatcher for task in AI_TASKS)
            and all(f'"{task}"' in selector for task in AI_TASKS)
            and all((project_root / "ai" / "prompts" / f"{task}.j2").is_file() for task in AI_TASKS),
            "dispatcher, selector, and prompt files must cover every AI task",
        ),
        AIContractCheck(
            "json-response-enforced",
            '"response_format": {"type": "json_object"}' in dispatcher
            and "Always respond with valid JSON" in dispatcher
            and all("Return ONLY valid JSON" in prompt for prompt in prompts.values()),
            "AI calls and prompts must require JSON-only structured output",
        ),
        AIContractCheck(
            "parser-bounds",
            "safety_impact: int = Field(ge=-5, le=5" in parsers
            and "health_impact: int = Field(ge=-5, le=5" in parsers
            and "new_safety_score: int = Field(ge=0, le=100)" in parsers
            and "new_health_index: int = Field(ge=0, le=100)" in parsers
            and "harm_level: int = Field(ge=0, le=5)" in parsers,
            "structured parsers must bound study impacts, scores, and molecule harm levels",
        ),
        AIContractCheck(
            "confidence-schema",
            parsers.count('Literal["high", "medium", "low"]') >= 3
            and all('"confidence"' in prompts[task] for task in ("study_analysis", "conflict_arbitration", "molecule_classification")),
            "AI outputs that expose confidence must use high/medium/low labels",
        ),
        AIContractCheck(
            "study-summary-safety",
            "return v[:2000]" in parsers
            and '"study_analysis"' in study_analyzer
            and "ai_summary" in study_analyzer
            and "ai_safety_impact" in study_analyzer,
            "study analysis must cap public summaries and persist structured impacts",
        ),
        AIContractCheck(
            "safety-adjustment-guardrails",
            "MAX_DELTA = 15" in safety_adjuster
            and '"safety_adjustment"' in safety_adjuster
            and "SafetyScoreRevision" in safety_adjuster
            and "pmid_cited" in prompts["safety_adjustment"],
            "safety adjustment must keep the 15-point cap, cite PMIDs, and write revisions",
        ),
        AIContractCheck(
            "runbook-linked-from-launch-checklist",
            "python scripts/check_ai_contract.py" in runbook
            and "docs/ai_contract_checks.md" in checklist,
            "launch checklist must link the AI contract runbook",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static AI prompt, parser, and model-routing contracts.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-ai-provider\trequires OpenRouter/OpenCode credentials and quota")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
