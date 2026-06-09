import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "src" / "pipeline" / "ingredients.py"
SPEC = importlib.util.spec_from_file_location("nutrii_ocr_ingredients_test", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
ingredients_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ingredients_module)
parse_ingredients_text = ingredients_module.parse_ingredients_text


def test_parse_ingredients_section_and_stops_before_nutrition():
    raw_text = """
    INGREDIENTS: Whole grain oats, sugar, sunflower oil, sea salt.
    Nutrition Facts serving size 40g calories 150
    """

    assert parse_ingredients_text(raw_text) == [
        "whole grain oats",
        "sugar",
        "sunflower oil",
        "sea salt",
    ]


def test_parse_parenthetical_sub_ingredients():
    raw_text = "Ingredients: enriched flour (wheat flour, niacin, iron), water; yeast"

    assert parse_ingredients_text(raw_text) == [
        "enriched flour",
        "wheat flour",
        "niacin",
        "iron",
        "water",
        "yeast",
    ]


def test_parse_without_explicit_ingredients_marker():
    raw_text = "Tomatoes, tomato juice, citric acid. Best before 2027"

    assert parse_ingredients_text(raw_text) == [
        "tomatoes",
        "tomato juice",
        "citric acid",
    ]


def test_parse_removes_duplicate_noise_and_may_contain_terms():
    raw_text = """
    Ingredients: Sugar, sugar, cocoa powder 12%, soy lecithin, may contain milk.
    Allergens: soy
    """

    assert parse_ingredients_text(raw_text) == [
        "sugar",
        "cocoa powder",
        "soy lecithin",
    ]


def test_parse_line_separated_ingredients():
    raw_text = """
    INGREDIENTS:
    Water
    Tomato paste
    Sea salt
    Nutrition Facts
    Serving size 125g
    """

    assert parse_ingredients_text(raw_text) == [
        "water",
        "tomato paste",
        "sea salt",
    ]


def test_parse_windows_newline_separated_ingredients():
    raw_text = "Ingredients:\r\nOats\r\nRaisins\r\nCinnamon\r\nBest before 2027"

    assert parse_ingredients_text(raw_text) == [
        "oats",
        "raisins",
        "cinnamon",
    ]
