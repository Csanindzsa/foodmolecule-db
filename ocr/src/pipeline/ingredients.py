"""Ingredient-list parsing helpers for OCR output."""

from __future__ import annotations

import re


SECTION_MARKERS = [
    "ingredients",
    "ingredient",
    "contains",
    "made with",
]

STOP_MARKERS = [
    "allergen",
    "allergens",
    "contains:",
    "nutrition facts",
    "nutrition information",
    "serving size",
    "distributed by",
    "manufactured by",
    "best before",
    "expiry",
]

NOISE_PATTERNS = [
    r"\b\d+(\.\d+)?\s*(g|mg|mcg|ug|kg|oz|ml|l|kcal|calories?)\b",
    r"\b\d+(\.\d+)?\s*%",
    r"\bper\s+\d+(\.\d+)?\s*(g|ml|serving)\b",
]


def parse_ingredients_text(raw_text: str, limit: int = 50) -> list[str]:
    """Return normalized ingredient terms from noisy OCR text."""
    normalized = _normalize_text(raw_text)
    ingredient_region = _ingredient_region(normalized)
    terms = _split_terms(ingredient_region)

    seen: set[str] = set()
    ingredients: list[str] = []
    for term in terms:
        cleaned = _clean_term(term)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        ingredients.append(cleaned)
        if len(ingredients) >= limit:
            break
    return ingredients


def _normalize_text(raw_text: str) -> str:
    text = raw_text.replace("\r", "\n")
    text = re.sub(r"[•·|]+", ",", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _ingredient_region(text: str) -> str:
    lower = text.lower()
    start = -1
    for marker in SECTION_MARKERS:
        match = re.search(rf"\b{re.escape(marker)}\b\s*:?", lower)
        if match and (start == -1 or match.start() < start):
            start = match.end()

    region = text[start:] if start >= 0 else text
    region_lower = region.lower()
    stop_positions = [
        match.start()
        for marker in STOP_MARKERS
        if (match := re.search(rf"\b{re.escape(marker)}\b", region_lower))
    ]
    if stop_positions:
        region = region[:min(stop_positions)]
    return region


def _split_terms(text: str) -> list[str]:
    expanded = re.sub(r"[()\[\]]", ",", text)
    expanded = re.sub(r"\band/or\b", ",", expanded, flags=re.IGNORECASE)
    expanded = re.sub(r"\band\b", ",", expanded, flags=re.IGNORECASE)
    return re.split(r"[,;]\s*|\n+", expanded)


def _clean_term(term: str) -> str:
    cleaned = term.strip(" .:*-\t").lower()
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-z0-9%+\-/ ]+", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -/")
    if len(cleaned) < 3:
        return ""
    if cleaned in {"may contain", "free from", "organic", "natural flavor"}:
        return ""
    if cleaned.startswith("may contain "):
        return ""
    return cleaned
