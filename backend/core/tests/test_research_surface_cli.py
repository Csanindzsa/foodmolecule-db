from pathlib import Path

from scripts import check_research_surface


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_research_surface_checker_passes_static_web_contract():
    checks = check_research_surface.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "study-api-fields" in names
    assert "study-web-types" in names
    assert "recent-research-api-hook" in names
    assert "recent-research-page" in names
    assert "pubmed-citation-link" in names
    assert "study-context-visible" in names


def test_research_surface_cli_outputs_live_handoff(capsys):
    exit_code = check_research_surface.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tpubmed-citation-link" in captured.out
    assert "skip\tlive-pubmed-links" in captured.out


def test_research_surface_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "research_surface_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_research_surface.py" in runbook
    assert "docs/research_surface_checks.md" in checklist
