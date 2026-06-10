from pathlib import Path

from scripts import check_launch_env


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LAUNCH_ENV = {
    "DJANGO_SECRET_KEY": "x" * 40,
    "DJANGO_DEBUG": "False",
    "DJANGO_ALLOWED_HOSTS": "api.nutrii.fit,nutrii-api.onrender.com",
    "DATABASE_URL": "postgresql://user:pass@example.com:5432/postgres",
    "CORS_ALLOWED_ORIGINS": "https://nutrii.fit,https://www.nutrii.fit",
    "RATE_LIMIT_REQUESTS_PER_MINUTE": "100",
    "DJANGO_LOG_LEVEL": "INFO",
    "OPENROUTER_API_KEY": "sk-or-real-launch-key",
    "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
    "VITE_API_URL": "https://api.nutrii.fit/api/v1",
    "EXPO_PUBLIC_API_URL": "https://api.nutrii.fit/api/v1",
}


ENV_KEYS = tuple(LAUNCH_ENV)


def test_launch_env_checker_accepts_complete_production_env():
    results = check_launch_env.run_checks(LAUNCH_ENV, ("all",))

    assert all(result.ok for result in results)
    assert {result.component for result in results} == {"backend", "ai", "web", "mobile"}


def test_launch_env_checker_rejects_local_or_placeholder_values():
    env = {
        **LAUNCH_ENV,
        "DJANGO_SECRET_KEY": "your-very-long-random-secret-key-here",
        "DJANGO_DEBUG": "True",
        "CORS_ALLOWED_ORIGINS": "http://localhost:5173",
        "VITE_API_URL": "http://localhost:8000/api/v1",
        "OPENROUTER_API_KEY": "",
    }

    results = check_launch_env.run_checks(env, ("backend", "ai", "web"))
    failures = {result.name for result in results if not result.ok}

    assert failures == {
        "DJANGO_SECRET_KEY",
        "DJANGO_DEBUG",
        "CORS_ALLOWED_ORIGINS",
        "OPENROUTER_API_KEY(S)",
        "VITE_API_URL",
    }


def test_launch_env_cli_does_not_print_secret_values(tmp_path, capsys, monkeypatch):
    for key in ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    env_file = tmp_path / ".env.launch"
    secret = "super-secret-value-that-must-not-appear"
    env_file.write_text(
        "\n".join(
            f"{key}={value}"
            for key, value in {
                **LAUNCH_ENV,
                "DJANGO_SECRET_KEY": secret,
            }.items()
        ),
        encoding="utf-8",
    )

    exit_code = check_launch_env.main(["--env-file", str(env_file)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert secret not in captured.out
    assert "DJANGO_SECRET_KEY" in captured.out


def test_launch_env_file_values_are_overridden_by_process_env(tmp_path, monkeypatch):
    for key in ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    env_file = tmp_path / ".env.launch"
    env_file.write_text("DJANGO_DEBUG=True\n", encoding="utf-8")
    monkeypatch.setenv("DJANGO_DEBUG", "False")

    env = check_launch_env.build_env([env_file])

    assert env["DJANGO_DEBUG"] == "False"


def test_launch_env_cli_reports_missing_env_file(capsys):
    exit_code = check_launch_env.main(["--env-file", "missing.env"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "env file not found" in captured.err


def test_launch_env_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "launch_environment.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_launch_env.py --env-file .env.production" in runbook
    assert "docs/launch_environment.md" in checklist
