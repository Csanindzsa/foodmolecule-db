from pathlib import Path

from scripts import check_ban_list_surface


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_ban_list_surface_checker_passes_current_draft_contract():
    checks = check_ban_list_surface.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "structured-data-draft-status" in names
    assert "entry-citation-gate" in names
    assert "web-draft-copy" in names
    assert "web-no-verified-badge" in names
    assert "web-lethal-dose-sanitizer" in names
    assert "web-text-sanitizer" in names


def test_ban_list_surface_cli_outputs_live_handoff(capsys):
    exit_code = check_ban_list_surface.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tweb-draft-copy" in captured.out
    assert "ok\tweb-lethal-dose-sanitizer" in captured.out
    assert "ok\tweb-text-sanitizer" in captured.out
    assert "skip\tverified-ban-list-live-review" in captured.out


def test_ban_list_surface_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "ban_list_surface_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_ban_list_surface.py" in runbook
    assert "docs/ban_list_surface_checks.md" in checklist
