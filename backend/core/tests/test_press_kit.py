from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
PRESS_KIT_PATH = PROJECT_ROOT / "docs" / "press_kit.md"


def test_press_kit_exists_with_launch_safe_positioning():
    press_kit = PRESS_KIT_PATH.read_text(encoding="utf-8")

    assert "Status: draft." in press_kit
    assert "## Boilerplate" in press_kit
    assert "## Approved Claims" in press_kit
    assert "Avoid these claims until externally verified:" in press_kit
    assert "Verified ban-list regulatory status for draft entries." in press_kit


def test_phase_dashboard_references_press_kit():
    dashboard = (PROJECT_ROOT / "obsidian" / "nutrii - Phase Status Dashboard.md").read_text(encoding="utf-8")

    assert "| Press kit | 🟡 Partial | Draft press kit created; production screenshots and contact details pending |" in dashboard
