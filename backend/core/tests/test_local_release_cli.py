from pathlib import Path

from scripts import check_local_release


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_local_release_audit_default_commands_are_no_credential_checks():
    commands = check_local_release.build_commands()
    names = [command.name for command in commands]

    assert names == [
        "seed-readiness",
        "ban-list-schema",
        "api-smoke-probe-list",
        "query-plan-target-list",
        "web-route-contract",
        "web-release-contract",
        "mobile-release-contract",
        "research-ops-contract",
        "image-ops-contract",
        "ban-list-surface-contract",
        "observability-contract",
        "ai-contract",
    ]


def test_local_release_audit_can_include_env_preflight(tmp_path):
    env_file = tmp_path / ".env.production"
    env_file.write_text("DJANGO_DEBUG=False\n", encoding="utf-8")

    commands = check_local_release.build_commands(env_file)

    assert commands[0].name == "launch-env-preflight"
    assert commands[0].args == ("scripts/check_launch_env.py", "--env-file", str(env_file))


def test_local_release_audit_reports_failed_commands(monkeypatch, capsys):
    calls = []

    def fake_run_command(command, *, python, cwd):
        calls.append(command.name)
        return 1 if command.name == "bad" else 0

    monkeypatch.setattr(check_local_release, "run_command", fake_run_command)
    exit_code = check_local_release.run_audit((
        check_local_release.AuditCommand("good", ("ok.py",)),
        check_local_release.AuditCommand("bad", ("bad.py",)),
    ))

    captured = capsys.readouterr()
    assert exit_code == 1
    assert calls == ["good", "bad"]
    assert "FAILED checks: bad" in captured.err


def test_local_release_cli_rejects_missing_env_file(capsys):
    exit_code = check_local_release.main(["--env-file", "missing.env"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "env file not found" in captured.err


def test_local_release_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "local_release_audit.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_local_release.py" in runbook
    assert "docs/local_release_audit.md" in checklist
