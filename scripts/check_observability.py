"""Validate no-secret production observability wiring."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ObservabilityCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[ObservabilityCheck, ...]:
    settings = _read(project_root / "backend" / "nutrii" / "settings.py")
    analytics = _read(project_root / "backend" / "core" / "analytics.py")
    render = _read(project_root / "render.yaml")
    runbook = _read(project_root / "docs" / "observability.md")
    checklist = _read(project_root / "docs" / "launch_checklist.md")

    return (
        ObservabilityCheck(
            "stdout-console-logging",
            '"disable_existing_loggers": False' in settings
            and '"class": "logging.StreamHandler"' in settings
            and '"handlers": ["console"]' in settings,
            "Django logging must emit through the console handler for platform log drains",
        ),
        ObservabilityCheck(
            "configurable-log-level",
            'DJANGO_LOG_LEVEL = config("DJANGO_LOG_LEVEL", default="INFO")' in settings
            and '"level": DJANGO_LOG_LEVEL' in settings,
            "root, django, and nutrii loggers must use DJANGO_LOG_LEVEL with INFO default",
        ),
        ObservabilityCheck(
            "analytics-info-logger",
            'logging.getLogger("nutrii.analytics")' in analytics
            and '"nutrii.analytics": {' in settings
            and '"level": "INFO"' in settings,
            "privacy-preserving analytics events must stay on an INFO logger",
        ),
        ObservabilityCheck(
            "analytics-allowlist",
            'ALLOWED_EVENT_TYPES = {"search", "view", "scan", "compare"}' in analytics
            and "ALLOWED_METADATA_KEYS" in analytics
            and "query_length" in analytics
            and "raw_text" not in analytics
            and "raw_query" not in analytics
            and "user_id" not in analytics,
            "analytics metadata must stay aggregate-only and reject raw text/user identifiers",
        ),
        ObservabilityCheck(
            "render-log-level",
            "DJANGO_LOG_LEVEL" in render and 'value: "INFO"' in render,
            "Render blueprint must set DJANGO_LOG_LEVEL=INFO",
        ),
        ObservabilityCheck(
            "runbook-deploy-verification",
            "python scripts/check_observability.py" in runbook
            and "nutrii.analytics" in runbook
            and "raw OCR label text" in runbook
            and "docs/observability.md" in checklist,
            "observability runbook must document the static check and deployed log verification",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate no-secret production observability wiring.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\texternal-log-sink\trequires Sentry, Logtail, or hosting log-drain credentials")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
