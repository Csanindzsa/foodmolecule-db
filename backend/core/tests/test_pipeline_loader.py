import json

import pytest

from core.models import Food, FoodMolecule, Molecule
from scripts.loaders.bulk_insert import link_food_molecules, load_json_entries
from scripts.pipeline.models import FoodEntry, FoodMoleculeLink


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


@pytest.mark.django_db
def test_link_food_molecules_reuses_existing_molecule_case_insensitively():
    food = Food.objects.create(name="spinach")
    molecule = Molecule.objects.create(name="oxalic acid", harm_level=3)

    link_food_molecules(
        food,
        [
            FoodMoleculeLink(
                molecule_name=" Oxalic Acid ",
                amount_per_100g=750,
                unit="mg",
                amount_notes="varies by cultivar",
            )
        ],
    )

    assert Molecule.objects.count() == 1
    relation = FoodMolecule.objects.get(food=food)
    assert relation.molecule == molecule
    assert relation.amount_per_100g == 750
    assert relation.amount_notes == "varies by cultivar"


@pytest.mark.django_db
def test_link_food_molecules_creates_normalized_stub_for_missing_molecule():
    food = Food.objects.create(name="tomato")

    link_food_molecules(
        food,
        [FoodMoleculeLink(molecule_name=" Lycopene (total) ", amount_per_100g=2.5)],
    )

    molecule = Molecule.objects.get()
    assert molecule.name == "lycopene"
    assert FoodMolecule.objects.get(food=food).molecule == molecule


@pytest.mark.django_db
def test_link_food_molecules_rejects_blank_molecule_names():
    food = Food.objects.create(name="apple")

    with pytest.raises(ValueError, match="Blank molecule name"):
        link_food_molecules(food, [FoodMoleculeLink(molecule_name="   ")])
