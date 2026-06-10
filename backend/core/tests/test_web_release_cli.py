from pathlib import Path

from scripts import check_web_release


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_web_release_checker_passes_static_launch_contract():
    checks = check_web_release.run_checks(PROJECT_ROOT, PROJECT_ROOT / "web")

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "package-build-scripts" in names
    assert "vite-production-build" in names
    assert "api-base-url-contract" in names
    assert "api-id-bound" in names
    assert "search-query-bound" in names
    assert "seo-head-metadata" in names
    assert "compare-display-sanitizers" in names
    assert "molecule-display-sanitizers" in names
    assert "optional-text-sanitizers" in names
    assert "ci-web-build" in names


def test_web_release_cli_outputs_live_handoff(capsys):
    exit_code = check_web_release.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tapi-id-bound" in captured.out
    assert "ok\tseo-head-metadata" in captured.out
    assert "ok\tsearch-query-bound" in captured.out
    assert "ok\tcompare-display-sanitizers" in captured.out
    assert "ok\tmolecule-display-sanitizers" in captured.out
    assert "ok\toptional-text-sanitizers" in captured.out
    assert "skip\tlive-web-deploy" in captured.out


def test_web_release_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "web_release_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_web_release.py" in runbook
    assert "docs/web_release_checks.md" in checklist
