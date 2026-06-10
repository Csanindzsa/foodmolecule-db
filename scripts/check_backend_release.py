"""Validate static Django backend release wiring for hosted deploys."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class BackendReleaseCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run_checks(project_root: Path = PROJECT_ROOT) -> tuple[BackendReleaseCheck, ...]:
    render = _read(project_root / "render.yaml")
    requirements = _read(project_root / "backend" / "requirements.txt")
    settings = _read(project_root / "backend" / "nutrii" / "settings.py")
    views = _read(project_root / "backend" / "core" / "views.py")
    runbook = _read(project_root / "docs" / "backend_release_checks.md")
    checklist = _read(project_root / "docs" / "launch_checklist.md")

    return (
        BackendReleaseCheck(
            "render-python-runtime",
            "runtime: python" in render
            and "PYTHON_VERSION" in render
            and 'value: "3.11"' in render,
            "Render must run the same Python major/minor version used by CI",
        ),
        BackendReleaseCheck(
            "render-build-start-health",
            'buildCommand: "pip install -r backend/requirements.txt"' in render
            and 'startCommand: "cd backend && gunicorn nutrii.wsgi:application --bind 0.0.0.0:$PORT"' in render
            and "healthCheckPath: /api/v1/health/" in render,
            "Render must install backend requirements, start Gunicorn, and expose API health checks",
        ),
        BackendReleaseCheck(
            "render-production-env",
            "DJANGO_DEBUG" in render
            and 'value: "False"' in render
            and "DJANGO_ALLOWED_HOSTS" in render
            and "api.nutrii.fit" in render
            and "CORS_ALLOWED_ORIGINS" in render
            and "https://nutrii.fit,https://www.nutrii.fit" in render,
            "Render blueprint must carry production debug, host, and CORS settings",
        ),
        BackendReleaseCheck(
            "render-secret-env",
            "DATABASE_URL" in render
            and "sync: false" in render
            and "OPENROUTER_API_KEY" in render
            and "generateValue: true" in render,
            "database, AI key, and Django secret must remain provider-managed secrets",
        ),
        BackendReleaseCheck(
            "runtime-requirements",
            "Django>=5.0,<5.2" in requirements
            and "gunicorn>=" in requirements
            and "dj-database-url>=2.1" in requirements
            and "psycopg2-binary>=2.9" in requirements,
            "backend requirements must include Django, Gunicorn, and PostgreSQL URL drivers",
        ),
        BackendReleaseCheck(
            "django-production-settings",
            '"django.middleware.security.SecurityMiddleware"' in settings
            and "STATIC_ROOT = BASE_DIR / \"staticfiles\"" in settings
            and "conn_max_age=60" in settings
            and "conn_health_checks=True" in settings,
            "Django settings must keep security middleware, static root, and persistent DB health checks",
        ),
        BackendReleaseCheck(
            "scan-response-sanitizers",
            "def _scan_ingredients" in views
            and "if not isinstance(ingredient, str)" in views
            and "def _scan_raw_text_preview" in views
            and "if not isinstance(raw_text, str):" in views
            and "return \"\", False" in views
            and "def _scan_confidence" in views
            and "math.isfinite(confidence)" in views,
            "scan API must sanitize OCR ingredients, malformed raw text, and confidence before responding",
        ),
        BackendReleaseCheck(
            "search-query-bounds",
            "MAX_SEARCH_QUERY_CHARS = 128" in views
            and "MAX_FOOD_FILTER_VALUE_CHARS = 100" in views
            and "MAX_FOOD_FILTER_VALUES = 20" in views
            and "MAX_UUID_FILTER_VALUES = 20" in views
            and "def _parse_search_query_param" in views
            and "def _parse_filter_text_query_param" in views
            and "def _parse_filter_csv_query_param" in views
            and "def _parse_uuid_csv_query_param" in views
            and "must be at most {MAX_SEARCH_QUERY_CHARS} characters" in views
            and "must be at most {MAX_FOOD_FILTER_VALUE_CHARS} characters" in views
            and "must include at most {MAX_FOOD_FILTER_VALUES} values" in views
            and "must include at most {MAX_UUID_FILTER_VALUES} values" in views
            and "_parse_search_query_param(request, lowercase=True)" in views
            and "_parse_search_query_param(self.request)" in views,
            "search and list query filters must bound q/category/dietary/UUID filters before database filters",
        ),
        BackendReleaseCheck(
            "runbook-linked-from-launch-checklist",
            "python scripts/check_backend_release.py" in runbook
            and "docs/backend_release_checks.md" in checklist,
            "launch checklist must link the backend release runbook",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static Django backend release wiring.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-backend-deploy\trequires hosted service, production database, and provider secrets")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
