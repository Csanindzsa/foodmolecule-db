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
    api_hooks = _read(web_root / "src" / "hooks" / "useApi.ts")
    array_utils = _read(web_root / "src" / "lib" / "array.ts")
    home_page = _read(web_root / "src" / "pages" / "Home.tsx")
    search_page = _read(web_root / "src" / "pages" / "Search.tsx")
    ban_list_page = _read(web_root / "src" / "pages" / "BanList.tsx")
    compare_page = _read(web_root / "src" / "pages" / "Compare.tsx")
    amount_display = _read(web_root / "src" / "lib" / "amountDisplay.ts")
    compare_display = _read(web_root / "src" / "lib" / "compareDisplay.ts")
    food_detail = _read(web_root / "src" / "pages" / "FoodDetail.tsx")
    guide_display = _read(web_root / "src" / "lib" / "guideDisplay.ts")
    molecule_detail = _read(web_root / "src" / "pages" / "MoleculeDetail.tsx")
    molecule_display = _read(web_root / "src" / "lib" / "moleculeDisplay.ts")
    score_display = _read(web_root / "src" / "lib" / "scoreDisplay.ts")
    text_display = _read(web_root / "src" / "lib" / "textDisplay.ts")
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
            "search-query-bound",
            "MAX_SEARCH_QUERY_CHARS = 128" in search_page
            and "MAX_SEARCH_QUERY_CHARS = 128" in api_client
            and "function limitSearchQuery" in search_page
            and "Array.from(value).slice(0, MAX_SEARCH_QUERY_CHARS).join(\"\")" in search_page
            and "function searchQueryPath" in api_client
            and "Array.from(q).length > MAX_SEARCH_QUERY_CHARS" in api_client
            and "maxLength={MAX_SEARCH_QUERY_CHARS}" in search_page
            and "Search queries are limited to" in search_page,
            "web search must cap client queries to the backend search limit",
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
            and "function compareIdsPath" in api_client
            and "MIN_COMPARE_IDS = 2" in api_client
            and "MAX_COMPARE_IDS = 3" in api_client
            and "Compare IDs must be unique." in api_client
            and "Compare IDs must be non-empty." in api_client
            and "sharedMoleculeNames(data.shared_molecules)" in compare_page
            and "formatCount(data.total_unique_molecules)" in compare_page
            and "moleculeAmountEntries" in compare_display
            and "Number.isFinite(amount)" in compare_display
            and "sharedMoleculeNames" in compare_display
            and "formatCount" in compare_display
            and "Number.isFinite(value)" in compare_display,
            "web compare page and API client must bound IDs and sanitize molecule/count displays",
        ),
        WebReleaseCheck(
            "molecule-display-sanitizers",
            "formatHarmLevel(molecule.harm_level" in molecule_detail
            and "harmLevelLabel(molecule.harm_level)" in molecule_detail
            and "harmLevelBadgeClass(molecule.harm_level)" in molecule_detail
            and "formatMolecularWeight(molecule.molecular_weight)" in molecule_detail
            and "formatPubChemCid(molecule.pubchem_cid)" in molecule_detail
            and "formatReductionPercent(neutralization.reduction_percent_min)" in molecule_detail
            and "formatReductionPercent(neutralization.reduction_percent_max)" in molecule_detail
            and "stringItems(food.aliases)" in api_hooks
            and "stringItems(molecule.harm_mechanisms)" in api_hooks
            and "stringItems" in array_utils
            and "foodMoleculeBadgeClass(fm.molecule.harm_level" in food_detail
            and "foodMoleculeBadgeLabel(fm.molecule.harm_level" in food_detail
            and "formatHealthLabel(health.label)" in food_detail
            and "formatAmount(fm.amount_per_100g, fm.unit)" in food_detail
            and "formatAmount" in amount_display
            and "Number.isFinite(parsed)" in amount_display
            and "normalizeHarmLevel" in molecule_display
            and "formatMolecularWeight" in molecule_display
            and "formatPubChemCid" in molecule_display
            and "formatReductionPercent" in molecule_display
            and "Number.isFinite(value)" in molecule_display,
            "web molecule surfaces must sanitize harm levels, text arrays, amounts, numeric properties, and neutralization reductions before rendering text or badge classes",
        ),
        WebReleaseCheck(
            "health-label-sanitizers",
            "formatHealthLabel" in score_display
            and "HEALTH_LABELS" in score_display
            and '"Excellent", "Good", "Fair", "Caution", "Poor", "Avoid"' in score_display
            and 'typeof value !== "string"' in score_display,
            "web food detail must render health-index labels through the backend label allowlist",
        ),
        WebReleaseCheck(
            "guide-display-sanitizers",
            "formatGuideText(guide?.guide)" in food_detail
            and "formatGuideText" in guide_display
            and 'typeof value !== "string"' in guide_display,
            "web food detail must sanitize AI guide copy before rendering",
        ),
        WebReleaseCheck(
            "optional-text-sanitizers",
            "formatOptionalText" in text_display
            and 'typeof value !== "string"' in text_display
            and "formatOptionalText(food.category)" in home_page
            and "formatOptionalText(food.category)" in food_detail
            and "formatOptionalText(m.molecular_formula)" in search_page
            and "formatOptionalText(entry.food?.category)" in ban_list_page
            and "formatOptionalText(entry.safe_condition)" in ban_list_page
            and "formatOptionalText(molecule.molecular_formula)" in molecule_detail
            and "formatOptionalText(food.category)" in molecule_detail,
            "web optional category and formula text must be sanitized before rendering",
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
