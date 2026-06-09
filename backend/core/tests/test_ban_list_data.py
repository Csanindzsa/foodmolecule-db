import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BAN_LIST_PATH = PROJECT_ROOT / "ban_list" / "ban_list.json"
CONDITIONAL_WARNINGS_PATH = PROJECT_ROOT / "ban_list" / "conditional_warnings.md"
REGULATORY_TRACKER_PATH = PROJECT_ROOT / "ban_list" / "regulatory_tracker.md"


def _ban_list_data() -> dict:
    return json.loads(BAN_LIST_PATH.read_text(encoding="utf-8"))


def test_ban_list_json_contains_migrated_draft_entries():
    data = _ban_list_data()
    food_names = {entry["food_name"] for entry in data["entries"]}

    assert data["evidence_status"] == "draft_requires_citation"
    assert len(food_names) == 9
    assert {
        "Castor beans",
        "Raw bitter almonds",
        "Puffer fish / fugu (unprepared)",
        "Raw kidney beans",
    }.issubset(food_names)


def test_ban_list_json_entries_remain_citation_required_until_verified():
    data = _ban_list_data()

    assert all(entry["metadata"]["source"] == "ban_list/ban_list.md" for entry in data["entries"])
    assert all(entry["metadata"]["requires_citation"] is True for entry in data["entries"])


def test_ban_list_draft_docs_exist_and_preserve_citation_gate():
    conditional = CONDITIONAL_WARNINGS_PATH.read_text(encoding="utf-8")
    regulatory = REGULATORY_TRACKER_PATH.read_text(encoding="utf-8")

    assert "Status: draft" in conditional
    assert "requires_citation" in conditional
    assert "Status: draft" in regulatory
    assert "requires_citation" in regulatory
    assert "python scripts/validate_schema.py ban_list ban_list/ban_list.json" in conditional
    assert "python scripts/validate_schema.py ban_list ban_list/ban_list.json" in regulatory
