"""
OCR ingredient label scanner — server-side fallback pipeline.
Receives a photo, returns matched ingredients with safety data.
"""

import io
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import pytesseract
from PIL import Image


@dataclass
class ScanResult:
    ingredients: List[str]
    confidence: float
    raw_text: str


class LabelScanner:
    """Server-side scanner using Tesseract OCR."""

    def __init__(self, tesseract_cmd: Optional[str] = None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def preprocess(self, image: Image.Image) -> Image.Image:
        """Convert to grayscale and increase contrast."""
        gray = image.convert("L")
        # Simple contrast boost via point transform
        return gray.point(lambda p: min(255, int(p * 1.2)))

    def scan(self, image_bytes: bytes) -> ScanResult:
        image = Image.open(io.BytesIO(image_bytes))
        processed = self.preprocess(image)
        raw_text = pytesseract.image_to_string(processed)
        conf_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        avg_conf = self._average_confidence(conf_data)
        ingredients = self._extract_ingredients(raw_text)
        return ScanResult(
            ingredients=ingredients,
            confidence=avg_conf,
            raw_text=raw_text,
        )

    @staticmethod
    def _average_confidence(conf_data: dict) -> float:
        confs = [int(c) for c in conf_data["conf"] if int(c) > 0]
        return sum(confs) / len(confs) if confs else 0.0

    @staticmethod
    def _extract_ingredients(raw_text: str) -> List[str]:
        """Heuristic parser: split on commas and newlines, strip fluff."""
        lines = raw_text.replace(",", "\n").splitlines()
        cleaned = [line.strip().rstrip(".*") for line in lines if len(line.strip()) > 2]
        # TODO: fuzzy match against molecule/food database
        return cleaned
