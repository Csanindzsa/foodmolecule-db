from pathlib import Path

from scripts import check_image_ops


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_image_ops_checker_passes_static_enrichment_contract():
    checks = check_image_ops.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "food-source-allowlist" in names
    assert "source-download-safety" in names
    assert "supabase-upload" in names
    assert "overnight-image-steps" in names
    assert "runbook-image-guidance" in names


def test_image_ops_cli_outputs_live_handoff(capsys):
    exit_code = check_image_ops.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\twebp-compression" in captured.out
    assert "skip\tlive-image-enrichment" in captured.out


def test_image_ops_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "image_ops_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_image_ops.py" in runbook
    assert "docs/image_ops_checks.md" in checklist
