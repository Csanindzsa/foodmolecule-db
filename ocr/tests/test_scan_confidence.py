import importlib.util
import sys
import types
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "src" / "pipeline" / "scan.py"


def _load_scan_module(monkeypatch):
    fake_pytesseract = types.ModuleType("pytesseract")
    fake_pytesseract.pytesseract = types.SimpleNamespace(tesseract_cmd="")
    fake_pytesseract.Output = types.SimpleNamespace(DICT="dict")

    fake_pil = types.ModuleType("PIL")
    fake_pil_image = types.ModuleType("PIL.Image")
    fake_pil_image.Image = type("Image", (), {})
    fake_pil.Image = fake_pil_image

    monkeypatch.setitem(sys.modules, "pytesseract", fake_pytesseract)
    monkeypatch.setitem(sys.modules, "PIL", fake_pil)
    monkeypatch.setitem(sys.modules, "PIL.Image", fake_pil_image)

    spec = importlib.util.spec_from_file_location("nutrii_ocr_scan_test", MODULE_PATH)
    assert spec is not None and spec.loader is not None
    scan_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scan_module)
    return scan_module


def test_average_confidence_accepts_decimal_tesseract_values(monkeypatch):
    scan_module = _load_scan_module(monkeypatch)

    result = scan_module.LabelScanner._average_confidence({"conf": ["-1", "0", "88.5", "93"]})

    assert result == 90.75


def test_average_confidence_ignores_malformed_values(monkeypatch):
    scan_module = _load_scan_module(monkeypatch)

    result = scan_module.LabelScanner._average_confidence({"conf": [None, "", "bad", "42.5"]})

    assert result == 42.5


def test_average_confidence_returns_zero_without_positive_values(monkeypatch):
    scan_module = _load_scan_module(monkeypatch)

    result = scan_module.LabelScanner._average_confidence({"conf": ["-1", "0", ""]})

    assert result == 0.0
