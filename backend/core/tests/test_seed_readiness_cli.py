import json
from pathlib import Path

from scripts import check_seed_readiness


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _write_seed_file(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _valid_food(name: str, category: str = "Fruit") -> dict:
    return {"name": name, "category": category}


def _valid_molecule(name: str) -> dict:
    return {
        "name": name,
        "harm_level": 0,
        "is_heat_stable": True,
        "is_neutralizable": False,
    }


def test_seed_readiness_accepts_schema_valid_counts(tmp_path):
    _write_seed_file(tmp_path / "foods" / "apple.json", _valid_food("apple"))
    _write_seed_file(tmp_path / "foods" / "pear.json", _valid_food("pear"))
    _write_seed_file(tmp_path / "molecules" / "water.json", _valid_molecule("water"))

    readiness = check_seed_readiness.check_seed_readiness(
        tmp_path,
        min_foods=2,
        min_molecules=1,
    )

    assert readiness.ok
    assert readiness.food_count == 2
    assert readiness.molecule_count == 1
    assert readiness.category_count == 1
    assert readiness.food_schema_failures == 0
    assert readiness.molecule_schema_failures == 0


def test_seed_readiness_rejects_low_counts(tmp_path):
    _write_seed_file(tmp_path / "foods" / "apple.json", _valid_food("apple"))
    _write_seed_file(tmp_path / "molecules" / "water.json", _valid_molecule("water"))

    readiness = check_seed_readiness.check_seed_readiness(
        tmp_path,
        min_foods=2,
        min_molecules=2,
    )

    assert not readiness.ok


def test_seed_readiness_rejects_schema_failures(tmp_path):
    _write_seed_file(tmp_path / "foods" / "apple.json", {"name": "apple", "category": 123})
    _write_seed_file(tmp_path / "molecules" / "water.json", _valid_molecule("water"))

    readiness = check_seed_readiness.check_seed_readiness(
        tmp_path,
        min_foods=1,
        min_molecules=1,
    )

    assert not readiness.ok
    assert readiness.food_schema_failures == 1


def test_seed_readiness_cli_prints_summary(tmp_path, capsys):
    _write_seed_file(tmp_path / "foods" / "apple.json", _valid_food("apple"))
    _write_seed_file(tmp_path / "molecules" / "water.json", _valid_molecule("water"))

    exit_code = check_seed_readiness.main([
        "--seed-dir",
        str(tmp_path),
        "--min-foods",
        "1",
        "--min-molecules",
        "1",
    ])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok\tfoods\tcount=1\tminimum=1\tschema_failures=0" in captured.out
    assert "ok\tmolecules\tcount=1\tminimum=1\tschema_failures=0" in captured.out


def test_seed_readiness_cli_rejects_negative_minimum(capsys):
    exit_code = check_seed_readiness.main(["--min-foods", "-1"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "minimum counts must be non-negative" in captured.err


def test_seed_readiness_runbook_is_linked_from_launch_checklist():
    runbook = (PROJECT_ROOT / "docs" / "seed_readiness.md").read_text(encoding="utf-8")
    checklist = (PROJECT_ROOT / "docs" / "launch_checklist.md").read_text(encoding="utf-8")

    assert "python scripts/check_seed_readiness.py --min-foods 100" in runbook
    assert "docs/seed_readiness.md" in checklist
