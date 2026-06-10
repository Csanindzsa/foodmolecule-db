from pathlib import Path

from scripts import check_image_surface


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_image_surface_checker_passes_static_web_contract():
    checks = check_image_surface.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "web-image-types" in names
    assert "food-detail-image" in names
    assert "molecule-detail-image" in names
    assert "list-image-thumbnails" in names


def test_image_surface_cli_outputs_live_handoff(capsys):
    exit_code = check_image_surface.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tfood-detail-image" in captured.out
    assert "skip\tlive-image-rendering" in captured.out


def test_image_surface_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "image_surface_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_image_surface.py" in runbook
    assert "docs/image_surface_checks.md" in checklist
