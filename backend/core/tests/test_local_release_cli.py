from pathlib import Path

from scripts import check_local_release


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_local_release_audit_default_commands_are_no_credential_checks():
    commands = check_local_release.build_commands()
    names = [command.name for command in commands]

    assert names == [
        "seed-readiness",
        "ban-list-schema",
        "django-migration-drift",
        "backend-release-contract",
        "api-smoke-probe-list",
        "query-plan-target-list",
        "web-route-contract",
        "web-release-contract",
        "mobile-release-contract",
        "research-ops-contract",
        "research-surface-contract",
        "image-ops-contract",
        "ban-list-surface-contract",
        "observability-contract",
        "ai-contract",
        "image-surface-contract",
    ]


def test_local_release_migration_drift_uses_offline_database_fallback():
    commands = check_local_release.build_commands()
    migration_command = next(
        command for command in commands if command.name == "django-migration-drift"
    )

    assert migration_command.env_overrides == (
        ("DATABASE_URL", ""),
        ("SUPABASE_URL", ""),
        ("SUPABASE_DB_PASSWORD", ""),
    )


def test_backend_venv_python_detects_project_virtualenv(tmp_path):
    python = tmp_path / "backend" / ".venv" / "bin" / "python"
    python.parent.mkdir(parents=True)
    python.write_text("#!/usr/bin/env python\n", encoding="utf-8")

    assert check_local_release.backend_venv_python(tmp_path) == str(python)


def test_backend_venv_python_allows_missing_virtualenv(tmp_path):
    assert check_local_release.backend_venv_python(tmp_path) is None


def test_local_release_audit_can_include_env_preflight(tmp_path):
    env_file = tmp_path / ".env.production"
    env_file.write_text("DJANGO_DEBUG=False\n", encoding="utf-8")

    commands = check_local_release.build_commands(env_file)

    assert commands[0].name == "launch-env-preflight"
    assert commands[0].args == ("scripts/check_launch_env.py", "--env-file", str(env_file))


def test_run_command_applies_command_env_overrides(monkeypatch, tmp_path):
    captured = {}

    class Result:
        returncode = 0

    def fake_run(args, *, cwd, env, check):
        captured["args"] = args
        captured["cwd"] = cwd
        captured["env"] = env
        captured["check"] = check
        return Result()

    monkeypatch.setenv("DATABASE_URL", "postgresql://remote.example/db")
    monkeypatch.setattr(check_local_release.subprocess, "run", fake_run)

    exit_code = check_local_release.run_command(
        check_local_release.AuditCommand(
            "offline",
            ("manage.py", "check"),
            (("DATABASE_URL", ""),),
        ),
        python="python",
        cwd=tmp_path,
    )

    assert exit_code == 0
    assert captured["args"] == ("python", "manage.py", "check")
    assert captured["cwd"] == tmp_path
    assert captured["check"] is False
    assert captured["env"]["DATABASE_URL"] == ""


def test_run_command_uses_command_python_override(monkeypatch, tmp_path):
    captured = {}

    class Result:
        returncode = 0

    def fake_run(args, *, cwd, env, check):
        captured["args"] = args
        return Result()

    monkeypatch.setattr(check_local_release.subprocess, "run", fake_run)

    exit_code = check_local_release.run_command(
        check_local_release.AuditCommand(
            "migration",
            ("backend/manage.py", "makemigrations", "--check", "--dry-run"),
            python="/repo/backend/.venv/bin/python",
        ),
        python="ambient-python",
        cwd=tmp_path,
    )

    assert exit_code == 0
    assert captured["args"] == (
        "/repo/backend/.venv/bin/python",
        "backend/manage.py",
        "makemigrations",
        "--check",
        "--dry-run",
    )


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
