from pathlib import Path

from scripts import check_backend_release


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_backend_release_checker_passes_static_deploy_contract():
    checks = check_backend_release.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "render-python-runtime" in names
    assert "render-build-start-health" in names
    assert "runtime-requirements" in names
    assert "django-production-settings" in names


def test_backend_release_cli_outputs_live_handoff(capsys):
    exit_code = check_backend_release.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\truntime-requirements" in captured.out
    assert "skip\tlive-backend-deploy" in captured.out


def test_backend_release_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "backend_release_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_backend_release.py" in runbook
    assert "docs/backend_release_checks.md" in checklist
