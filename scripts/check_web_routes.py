"""Validate static web route coverage without requiring Node dependencies."""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "web"
STATIC_SITEMAP_ROUTES = ("/", "/search", "/compare", "/research", "/ban-list")
LAUNCH_ROUTES = ("/", "/search", "/foods/:id", "/molecules/:id", "/compare", "/research", "/ban-list")


@dataclass(frozen=True)
class RouteCheck:
    name: str
    ok: bool
    detail: str


def extract_react_routes(app_path: Path) -> tuple[str, ...]:
    source = app_path.read_text(encoding="utf-8")
    return tuple(re.findall(r'<Route\s+path="([^"]+)"', source))


def sitemap_routes(sitemap_path: Path) -> tuple[str, ...]:
    tree = ET.parse(sitemap_path)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    routes: list[str] = []
    for loc in tree.findall(".//sm:loc", namespace):
        if not loc.text:
            continue
        route = loc.text.replace("https://nutrii.fit", "", 1) or "/"
        routes.append(route)
    return tuple(routes)


def vercel_rewrites(vercel_path: Path) -> list[dict]:
    return json.loads(vercel_path.read_text(encoding="utf-8")).get("rewrites", [])


def run_checks(web_root: Path = WEB_ROOT) -> tuple[RouteCheck, ...]:
    react_routes = extract_react_routes(web_root / "src" / "App.tsx")
    layout = (web_root / "src" / "components" / "Layout.tsx").read_text(encoding="utf-8")
    sitemap = sitemap_routes(web_root / "public" / "sitemap.xml")
    rewrites = vercel_rewrites(web_root / "vercel.json")
    redirects = (web_root / "public" / "_redirects").read_text(encoding="utf-8")

    checks = [
        RouteCheck(
            "react-launch-routes",
            set(LAUNCH_ROUTES).issubset(set(react_routes)),
            f"expected={','.join(LAUNCH_ROUTES)} actual={','.join(react_routes)}",
        ),
        RouteCheck(
            "sitemap-static-routes",
            tuple(sitemap) == STATIC_SITEMAP_ROUTES,
            f"expected={','.join(STATIC_SITEMAP_ROUTES)} actual={','.join(sitemap)}",
        ),
        RouteCheck(
            "header-nav-routes",
            layout.count('to="/compare"') >= 2
            and layout.count('to="/research"') >= 2
            and layout.count('to="/ban-list"') >= 2
            and "Compare" in layout
            and "Research" in layout
            and "Ban List" in layout,
            "expected desktop and mobile header navigation for compare, research, and ban-list routes",
        ),
        RouteCheck(
            "vercel-spa-fallback",
            {"source": "/((?!api|assets|favicon.svg|robots.txt|sitemap.xml).*)", "destination": "/index.html"}
            in rewrites,
            "expected Vercel rewrite to /index.html for SPA routes",
        ),
        RouteCheck(
            "netlify-spa-fallback",
            "/*    /index.html   200" in redirects,
            "expected Netlify _redirects SPA fallback",
        ),
    ]
    return tuple(checks)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate static web route launch coverage.")
    parser.add_argument("--web-root", type=Path, default=WEB_ROOT, help="Path to the web app root.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    checks = run_checks(args.web_root)
    for check in checks:
        prefix = "ok" if check.ok else "FAIL"
        print(f"{prefix}\t{check.name}\t{check.detail}")
    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
