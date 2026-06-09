import csv
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MATRIX_PATH = PROJECT_ROOT / "processing" / "compound_matrix.csv"


def _matrix_rows() -> list[dict[str, str]]:
    with MATRIX_PATH.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def test_processing_compound_matrix_has_expected_columns_and_rows():
    rows = _matrix_rows()

    assert rows
    assert set(rows[0]) == {
        "compound",
        "method",
        "reduction_percent_min",
        "reduction_percent_max",
        "conditions",
        "confidence",
        "source",
        "requires_citation",
        "notes",
    }
    assert len(rows) >= 20


def test_processing_compound_matrix_preserves_draft_citation_gate():
    rows = _matrix_rows()

    assert all(row["confidence"] == "draft" for row in rows)
    assert all(row["source"] == "processing/methods.md" for row in rows)
    assert all(row["requires_citation"] == "true" for row in rows)


def test_processing_compound_matrix_includes_neutralizable_and_ban_trigger_rows():
    rows = _matrix_rows()
    pairs = {(row["compound"], row["method"]) for row in rows}

    assert ("Oxalic acid", "Boiling") in pairs
    assert ("Phytohaemagglutinin", "Boiling") in pairs
    assert ("Phytic acid", "Fermentation") in pairs
    assert ("Tetrodotoxin", "None effective") in pairs
    assert ("Ricin", "None effective") in pairs
