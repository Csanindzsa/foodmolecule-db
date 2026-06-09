import json

import pytest

from scripts.loaders.bulk_insert import load_json_entries
from scripts.pipeline.models import FoodEntry


def _write_food(path, name: str) -> None:
    path.write_text(json.dumps({"name": name}), encoding="utf-8")


def test_load_json_entries_rejects_missing_directory(tmp_path):
    missing = tmp_path / "missing"

    with pytest.raises(FileNotFoundError, match="Seed data directory does not exist"):
        load_json_entries(missing, FoodEntry)


def test_load_json_entries_rejects_file_path(tmp_path):
    file_path = tmp_path / "food.json"
    _write_food(file_path, "Apple")

    with pytest.raises(NotADirectoryError, match="Seed data path is not a directory"):
        load_json_entries(file_path, FoodEntry)


def test_load_json_entries_reads_json_files_in_deterministic_order(tmp_path):
    _write_food(tmp_path / "b.json", "Banana")
    _write_food(tmp_path / "a.json", "Apple")
    (tmp_path / "notes.txt").write_text("ignored", encoding="utf-8")

    entries = load_json_entries(tmp_path, FoodEntry)

    assert [entry.name for entry in entries] == ["apple", "banana"]
