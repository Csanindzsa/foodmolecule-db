from pathlib import Path

from scripts import check_research_ops


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_research_ops_checker_passes_static_pipeline_contract():
    checks = check_research_ops.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "overnight:pubmed-command" in names
    assert "continue:pubmed-command" in names
    assert "study-analyzer-dispatch" in names
    assert "safety-adjuster-delta-cap" in names
    assert "runbook-cron-guidance" in names


def test_research_ops_cli_outputs_live_handoffs(capsys):
    exit_code = check_research_ops.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tovernight:pubmed-default-passes" in captured.out
    assert "skip\tlive-cron" in captured.out
    assert "skip\tai-provider-quota" in captured.out


def test_research_ops_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "research_ops_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_research_ops.py" in runbook
    assert "docs/research_ops_checks.md" in checklist
