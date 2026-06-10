"""Validate static React/Vite web release readiness without Node dependencies."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "web"
PRODUCTION_API_URL = "https://api.nutrii.fit/api/v1"


@dataclass(frozen=True)
class WebReleaseCheck:
    name: str
    ok: bool
    detail: str


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def run_checks(project_root: Path = PROJECT_ROOT, web_root: Path | None = None) -> tuple[WebReleaseCheck, ...]:
    web_root = web_root or project_root / "web"
    package = _load_json(web_root / "package.json")
    scripts = package.get("scripts", {})
    vite = _read(web_root / "vite.config.ts")
    api_client = _read(web_root / "src" / "lib" / "api.ts")
    compare_page = _read(web_root / "src" / "pages" / "Compare.tsx")
    compare_display = _read(web_root / "src" / "lib" / "compareDisplay.ts")
    index = _read(web_root / "index.html")
    robots = _read(web_root / "public" / "robots.txt")
    sitemap = _read(web_root / "public" / "sitemap.xml")
    workflow = _read(project_root / ".github" / "workflows" / "test.yml")
    env_template = _read(project_root / ".env.example")
    runbook = _read(project_root / "docs" / "web_release_checks.md")
    checklist = _read(project_root / "docs" / "launch_checklist.md")

    return (
        WebReleaseCheck(
            "package-build-scripts",
            package.get("private") is True
            and scripts.get("test") == "bun test --isolate src"
            and scripts.get("build") == "tsc -b && vite build"
            and "vite" in package.get("devDependencies", {})
            and (web_root / "bun.lock").is_file(),
            "web package must keep Bun test/build scripts, Vite dependency, and lockfile",
        ),
        WebReleaseCheck(
            "vite-production-build",
            "react()" in vite
            and "tailwindcss()" in vite
            and 'outDir: "dist"' in vite
            and "sourcemap: false" in vite,
            "Vite build must use React/Tailwind, emit dist, and avoid public production sourcemaps",
        ),
        WebReleaseCheck(
            "api-base-url-contract",
            "import.meta.env.VITE_API_URL" in api_client
            and "import.meta.env.VITE_API_BASE_URL" in api_client
            and '"/api/v1"' in api_client
            and ".replace(/\\/$/, \"\")" in api_client
            and PRODUCTION_API_URL in env_template,
            "web API client must support production VITE_API_URL with same-origin fallback",
        ),
        WebReleaseCheck(
            "seo-head-metadata",
            '<html lang="en">' in index
            and '<meta name="description"' in index
            and '<link rel="canonical" href="https://nutrii.fit/" />' in index
            and '<meta property="og:url" content="https://nutrii.fit/" />' in index
            and '<meta property="og:type" content="website" />' in index,
            "index.html must expose launch SEO, canonical, and Open Graph metadata",
        ),
        WebReleaseCheck(
            "crawl-assets",
            "Sitemap: https://nutrii.fit/sitemap.xml" in robots
            and "https://nutrii.fit/search" in sitemap
            and "https://nutrii.fit/compare" in sitemap
            and "https://nutrii.fit/research" in sitemap
            and "https://nutrii.fit/ban-list" in sitemap,
            "robots.txt and sitemap.xml must expose crawlable static routes",
        ),
        WebReleaseCheck(
            "compare-display-sanitizers",
            "moleculeAmountEntries(food.molecules)" in compare_page
            and "formatCount(data.total_unique_molecules)" in compare_page
            and "moleculeAmountEntries" in compare_display
            and "Number.isFinite(amount)" in compare_display
            and "formatCount" in compare_display
            and "Number.isFinite(value)" in compare_display,
            "web compare page must sanitize molecule amounts and count displays",
        ),
        WebReleaseCheck(
            "ci-web-build",
            "oven-sh/setup-bun" in workflow
            and "bun install --frozen-lockfile" in workflow
            and "bun run test" in workflow
            and "bun run build" in workflow
            and "python ../scripts/check_web_release.py" in workflow,
            "CI must install locked web dependencies, run tests, build, and run the static release check",
        ),
        WebReleaseCheck(
            "runbook-linked-from-launch-checklist",
            "python scripts/check_web_release.py" in runbook
            and "docs/web_release_checks.md" in checklist,
            "launch checklist must link the web release runbook",
        ),
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static React/Vite web release readiness.")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT, help="Repository root.")
    parser.add_argument("--web-root", type=Path, help="Path to the web app root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.project_root, args.web_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    print("skip\tlive-web-deploy\trequires DNS, hosting project, and Lighthouse run")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
