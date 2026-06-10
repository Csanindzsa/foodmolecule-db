import json
import os
import subprocess
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_rest_framework_settings(extra_env: dict[str, str]) -> dict:
    env = {
        **os.environ,
        "DATABASE_URL": "",
        "SUPABASE_URL": "",
        "SUPABASE_DB_PASSWORD": "",
        "DJANGO_SECRET_KEY": "test-production-settings-secret-key",
        "DJANGO_ALLOWED_HOSTS": "example.com",
        **extra_env,
    }
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import json; "
                "from nutrii.settings import REST_FRAMEWORK; "
                "print(json.dumps(REST_FRAMEWORK, sort_keys=True))"
            ),
        ],
        check=True,
        capture_output=True,
        cwd=BACKEND_ROOT,
        env=env,
        text=True,
    )
    return json.loads(result.stdout)


def test_production_settings_enable_configured_anonymous_throttle():
    rest_framework = _load_rest_framework_settings({
        "DJANGO_DEBUG": "False",
        "RATE_LIMIT_REQUESTS_PER_MINUTE": "42",
    })

    assert rest_framework["DEFAULT_THROTTLE_CLASSES"] == [
        "rest_framework.throttling.AnonRateThrottle",
    ]
    assert rest_framework["DEFAULT_THROTTLE_RATES"] == {"anon": "42/minute"}


def test_debug_settings_do_not_enable_anonymous_throttle():
    rest_framework = _load_rest_framework_settings({
        "DJANGO_DEBUG": "True",
        "RATE_LIMIT_REQUESTS_PER_MINUTE": "42",
    })

    assert "DEFAULT_THROTTLE_CLASSES" not in rest_framework
    assert "DEFAULT_THROTTLE_RATES" not in rest_framework
