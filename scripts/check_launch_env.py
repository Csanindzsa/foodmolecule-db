"""Validate launch-critical environment variables without printing secrets."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import urlparse


VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
PRODUCTION_ORIGINS = {"https://nutrii.fit", "https://www.nutrii.fit"}


@dataclass(frozen=True)
class CheckResult:
    component: str
    name: str
    ok: bool
    detail: str


Env = dict[str, str]
Check = Callable[[Env], CheckResult]


def _present(env: Env, key: str) -> bool:
    value = env.get(key, "").strip()
    return bool(value) and value not in {"your-very-long-random-secret-key-here", "sk-or-..."}


def _csv_values(value: str) -> set[str]:
    return {item.strip() for item in value.split(",") if item.strip()}


def _is_false(value: str) -> bool:
    return value.strip().lower() in {"false", "0", "no", "off"}


def _is_https_api_url(value: str) -> bool:
    parsed = urlparse(value.strip())
    return parsed.scheme == "https" and parsed.netloc and parsed.path.rstrip("/").endswith("/api/v1")


def _result(component: str, name: str, ok: bool, detail: str) -> CheckResult:
    return CheckResult(component=component, name=name, ok=ok, detail=detail)


def check_secret_key(env: Env) -> CheckResult:
    key = env.get("DJANGO_SECRET_KEY", "")
    ok = _present(env, "DJANGO_SECRET_KEY") and len(key) >= 32
    return _result("backend", "DJANGO_SECRET_KEY", ok, "set to a non-placeholder value with at least 32 chars")


def check_debug_disabled(env: Env) -> CheckResult:
    ok = _is_false(env.get("DJANGO_DEBUG", ""))
    return _result("backend", "DJANGO_DEBUG", ok, "must be False for production")


def check_allowed_hosts(env: Env) -> CheckResult:
    hosts = _csv_values(env.get("DJANGO_ALLOWED_HOSTS", ""))
    ok = "api.nutrii.fit" in hosts
    return _result("backend", "DJANGO_ALLOWED_HOSTS", ok, "must include api.nutrii.fit")


def check_database(env: Env) -> CheckResult:
    has_database_url = _present(env, "DATABASE_URL")
    has_supabase_pair = _present(env, "SUPABASE_URL") and _present(env, "SUPABASE_DB_PASSWORD")
    return _result(
        "backend",
        "database",
        has_database_url or has_supabase_pair,
        "set DATABASE_URL or SUPABASE_URL plus SUPABASE_DB_PASSWORD",
    )


def check_cors(env: Env) -> CheckResult:
    origins = _csv_values(env.get("CORS_ALLOWED_ORIGINS", ""))
    ok = PRODUCTION_ORIGINS.issubset(origins)
    return _result("backend", "CORS_ALLOWED_ORIGINS", ok, "must include nutrii.fit and www.nutrii.fit")


def check_rate_limit(env: Env) -> CheckResult:
    try:
        value = int(env.get("RATE_LIMIT_REQUESTS_PER_MINUTE", ""))
    except ValueError:
        value = 0
    return _result("backend", "RATE_LIMIT_REQUESTS_PER_MINUTE", value > 0, "must be a positive integer")


def check_log_level(env: Env) -> CheckResult:
    level = env.get("DJANGO_LOG_LEVEL", "INFO").strip().upper()
    return _result("backend", "DJANGO_LOG_LEVEL", level in VALID_LOG_LEVELS, "must be a valid Python log level")


def check_openrouter_key(env: Env) -> CheckResult:
    ok = _present(env, "OPENROUTER_API_KEY") or _present(env, "OPENROUTER_API_KEYS")
    return _result("ai", "OPENROUTER_API_KEY(S)", ok, "at least one launch AI provider key must be configured")


def check_openrouter_base_url(env: Env) -> CheckResult:
    value = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip()
    parsed = urlparse(value)
    ok = parsed.scheme == "https" and bool(parsed.netloc)
    return _result("ai", "OPENROUTER_BASE_URL", ok, "must be an https URL")


def check_web_api_url(env: Env) -> CheckResult:
    value = env.get("VITE_API_URL", "").strip() or env.get("VITE_API_BASE_URL", "").strip()
    return _result("web", "VITE_API_URL", _is_https_api_url(value), "must be an https /api/v1 URL")


def check_mobile_api_url(env: Env) -> CheckResult:
    value = env.get("EXPO_PUBLIC_API_URL", "").strip()
    return _result("mobile", "EXPO_PUBLIC_API_URL", _is_https_api_url(value), "must be an https /api/v1 URL")


CHECKS_BY_COMPONENT: dict[str, tuple[Check, ...]] = {
    "backend": (
        check_secret_key,
        check_debug_disabled,
        check_allowed_hosts,
        check_database,
        check_cors,
        check_rate_limit,
        check_log_level,
    ),
    "ai": (
        check_openrouter_key,
        check_openrouter_base_url,
    ),
    "web": (check_web_api_url,),
    "mobile": (check_mobile_api_url,),
}


def load_env_file(path: Path) -> Env:
    values: Env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def build_env(env_files: Iterable[Path]) -> Env:
    merged: Env = {}
    for path in env_files:
        merged.update(load_env_file(path))
    merged.update(os.environ)
    return merged


def selected_checks(components: Iterable[str]) -> tuple[Check, ...]:
    checks: list[Check] = []
    selected = tuple(components)
    if "all" in selected:
        selected = tuple(CHECKS_BY_COMPONENT)
    for component in selected:
        checks.extend(CHECKS_BY_COMPONENT[component])
    return tuple(checks)


def run_checks(env: Env, components: Iterable[str]) -> tuple[CheckResult, ...]:
    return tuple(check(env) for check in selected_checks(components))


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate nutrii launch environment variables.")
    parser.add_argument(
        "--component",
        action="append",
        choices=("all", *CHECKS_BY_COMPONENT.keys()),
        default=None,
        help="Component to validate. Repeatable. Defaults to all.",
    )
    parser.add_argument(
        "--env-file",
        action="append",
        type=Path,
        default=[],
        help="Optional dotenv-style file to read before process env overrides.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    missing_files = [path for path in args.env_file if not path.is_file()]
    if missing_files:
        for path in missing_files:
            print(f"error: env file not found: {path}", file=sys.stderr)
        return 2

    components = tuple(args.component or ("all",))
    env = build_env(args.env_file)
    results = run_checks(env, components)
    for result in results:
        prefix = "ok" if result.ok else "FAIL"
        print(f"{prefix}\t{result.component}\t{result.name}\t{result.detail}")

    return 0 if all(result.ok for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
