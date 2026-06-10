from pathlib import Path

from scripts import check_web_routes


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_web_route_checker_passes_current_static_contract():
    checks = check_web_routes.run_checks(PROJECT_ROOT / "web")

    assert all(check.ok for check in checks)
    assert {check.name for check in checks} == {
        "react-launch-routes",
        "sitemap-static-routes",
        "header-nav-routes",
        "vercel-spa-fallback",
        "netlify-spa-fallback",
    }


def test_web_route_checker_extracts_react_routes_from_app_source():
    routes = check_web_routes.extract_react_routes(PROJECT_ROOT / "web" / "src" / "App.tsx")

    assert routes == (
        "/",
        "/search",
        "/foods/:id",
        "/molecules/:id",
        "/ban-list",
        "/compare",
        "*",
    )


def test_web_route_cli_outputs_summary(capsys):
    exit_code = check_web_routes.main(["--web-root", str(PROJECT_ROOT / "web")])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\treact-launch-routes" in captured.out
    assert "ok\theader-nav-routes" in captured.out
    assert "ok\tvercel-spa-fallback" in captured.out


def test_web_route_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "web_route_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_web_routes.py" in runbook
    assert "docs/web_route_checks.md" in checklist
