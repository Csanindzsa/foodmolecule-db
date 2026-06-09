import json

from scripts import validate_schema


def test_validate_schema_cli_accepts_valid_food_file(tmp_path, capsys):
    path = tmp_path / "food.json"
    path.write_text(json.dumps({"name": "Apple", "category": "Fruit"}), encoding="utf-8")

    exit_code = validate_schema.main(["food", str(path)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "Validation passed for 1 food file(s)." in captured.out


def test_validate_schema_cli_reports_schema_errors(tmp_path, capsys):
    path = tmp_path / "food.json"
    path.write_text(json.dumps({"name": "Apple", "category": 123}), encoding="utf-8")

    exit_code = validate_schema.main(["food", str(path)])

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "Validation failed for 1 file(s):" in captured.err
    assert "category: 123 is not of type 'string'" in captured.err


def test_validate_schema_cli_reports_invalid_json(tmp_path, capsys):
    path = tmp_path / "food.json"
    path.write_text('{"name": "Apple"', encoding="utf-8")

    exit_code = validate_schema.main(["food", str(path)])

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "Invalid JSON:" in captured.err
