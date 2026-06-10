from pathlib import Path

from scripts import check_ai_contract


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_ai_contract_checker_passes_static_prompt_parser_contract():
    checks = check_ai_contract.run_checks(PROJECT_ROOT)

    assert all(check.ok for check in checks)
    names = {check.name for check in checks}
    assert "task-map-complete" in names
    assert "json-response-enforced" in names
    assert "parser-bounds" in names
    assert "safety-adjustment-guardrails" in names


def test_ai_contract_cli_outputs_live_provider_handoff(capsys):
    exit_code = check_ai_contract.main(["--project-root", str(PROJECT_ROOT)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tjson-response-enforced" in captured.out
    assert "skip\tlive-ai-provider" in captured.out


def test_ai_contract_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "ai_contract_checks.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_ai_contract.py" in runbook
    assert "docs/ai_contract_checks.md" in checklist
