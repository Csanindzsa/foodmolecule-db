from pathlib import Path

from scripts import check_secret_hygiene


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_secret_hygiene_allows_env_example(tmp_path):
    env_example = tmp_path / ".env.example"
    env_example.write_text("OPENROUTER_API_KEY=sk-or-...\n", encoding="utf-8")

    assert check_secret_hygiene.scan_tracked_files([env_example], tmp_path) == []


def test_secret_hygiene_rejects_tracked_env_file(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("DJANGO_SECRET_KEY=local-only\n", encoding="utf-8")

    findings = check_secret_hygiene.scan_tracked_files([env_file], tmp_path)

    assert findings == [check_secret_hygiene.Finding("tracked-env-file", ".env", 1)]


def test_secret_hygiene_rejects_private_key_blocks(tmp_path):
    key_file = tmp_path / "deploy_key.txt"
    key_file.write_text("-----BEGIN PRIVATE KEY-----\nredacted\n", encoding="utf-8")

    findings = check_secret_hygiene.scan_tracked_files([key_file], tmp_path)

    assert findings == [check_secret_hygiene.Finding("private-key-block", "deploy_key.txt", 1)]


def test_secret_hygiene_rejects_actual_looking_provider_keys(tmp_path):
    script = tmp_path / "script.py"
    script.write_text(
        'OPENROUTER_API_KEY = "sk-or-v1-abcdefghijklmnopqrstuvwxyz123456"\n',
        encoding="utf-8",
    )

    findings = check_secret_hygiene.scan_tracked_files([script], tmp_path)

    assert findings == [check_secret_hygiene.Finding("openrouter-api-key", "script.py", 1)]


def test_secret_hygiene_rejects_service_role_in_client_code(tmp_path):
    client = tmp_path / "web" / "src" / "client.ts"
    client.parent.mkdir(parents=True)
    client.write_text('const key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n', encoding="utf-8")

    findings = check_secret_hygiene.scan_tracked_files([client], tmp_path)

    assert findings == [
        check_secret_hygiene.Finding("client-service-role-reference", "web/src/client.ts", 1)
    ]


def test_secret_hygiene_current_repo_passes():
    findings = check_secret_hygiene.scan_tracked_files(
        check_secret_hygiene.tracked_files(PROJECT_ROOT),
        PROJECT_ROOT,
    )

    assert findings == []
