from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_render_blueprint_uses_current_production_domain():
    blueprint = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")

    assert "api.nutrii.fit" in blueprint
    assert "https://nutrii.fit" in blueprint
    assert "https://www.nutrii.fit" in blueprint
    assert "nutrii.app" not in blueprint


def test_ci_runs_web_tests_and_build():
    workflow = (PROJECT_ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")

    assert "bun run test" in workflow
    assert "bun run build" in workflow
