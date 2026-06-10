from pathlib import Path
import json


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_render_blueprint_uses_current_production_domain():
    blueprint = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")

    assert "api.nutrii.fit" in blueprint
    assert "https://nutrii.fit" in blueprint
    assert "https://www.nutrii.fit" in blueprint
    assert "nutrii.app" not in blueprint


def test_render_blueprint_sets_production_logging_level():
    blueprint = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")

    assert "DJANGO_LOG_LEVEL" in blueprint
    assert 'value: "INFO"' in blueprint


def test_env_template_documents_production_logging_level():
    env_template = (PROJECT_ROOT / ".env.example").read_text(encoding="utf-8")

    assert "DJANGO_LOG_LEVEL=INFO" in env_template


def test_ci_runs_web_tests_and_build():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "bun run test" in workflow
    assert "bun run build" in workflow


def test_ci_runs_backend_ai_and_ocr_tests():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "python -m pytest core/tests -q" in workflow
    assert "python -m pytest ai/tests -q" in workflow
    assert "python -m pytest ocr/tests -q" in workflow


def test_ci_compiles_python_sources_before_tests():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "python -m compileall -q ../ai . ../ocr ../scripts" in workflow


def test_ci_validates_food_seed_schemas():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "python ../scripts/validate_schema.py food ../data/seed/foods" in workflow


def test_ci_validates_ban_list_schema():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "python ../scripts/validate_schema.py ban_list ../ban_list/ban_list.json" in workflow


def test_static_host_configs_rewrite_spa_routes_to_index():
    vercel_config = json.loads((PROJECT_ROOT / "web" / "vercel.json").read_text(encoding="utf-8"))
    redirects = (PROJECT_ROOT / "web" / "public" / "_redirects").read_text(encoding="utf-8")

    assert {
        "source": "/((?!api|assets|favicon.svg|robots.txt|sitemap.xml).*)",
        "destination": "/index.html",
    } in vercel_config["rewrites"]
    assert "/*    /index.html   200" in redirects


def test_observability_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "observability.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "DJANGO_LOG_LEVEL=INFO" in runbook
    assert "nutrii.analytics" in runbook
    assert "docs/observability.md" in checklist
