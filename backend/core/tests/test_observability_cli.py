from pathlib import Path

from scripts import check_observability


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_observability_checker_passes_static_logging_contract():
    checks = check_observability.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "stdout-console-logging" in names
    assert "analytics-info-logger" in names
    assert "analytics-allowlist" in names
    assert "render-log-level" in names


def test_observability_cli_outputs_external_sink_handoff(capsys):
    exit_code = check_observability.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tanalytics-allowlist" in captured.out
    assert "skip\texternal-log-sink" in captured.out


def test_observability_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "observability.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_observability.py" in runbook
    assert "docs/observability.md" in checklist
