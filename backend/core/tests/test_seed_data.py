"""
Tests for the seed_data management command.

Covers:
- Happy path: seeding molecules, foods, categories, and food-molecule links
- Idempotency: running twice updates rather than duplicates
- --clear flag: removes existing data before seeding
- --path flag: custom seed directory
- Edge cases: missing molecule references, empty directories, missing directories
- Data integrity: UUID preservation, decimal field handling, boolean fields
"""

from __future__ import annotations

import json
import tempfile
from decimal import Decimal
from pathlib import Path
from uuid import UUID

import pytest
from django.core.management import call_command

from core.models import Food, FoodCategory, FoodMolecule, Molecule


@pytest.fixture
def temp_seed_dir():
    """Create a temporary seed directory with minimal valid data."""
    with tempfile.TemporaryDirectory() as tmpdir:
        seed_path = Path(tmpdir)
        molecules_dir = seed_path / "molecules"
        foods_dir = seed_path / "foods"
        molecules_dir.mkdir()
        foods_dir.mkdir()

        # Create a minimal molecule
        molecule_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        (molecules_dir / "test_mol.json").write_text(
            json.dumps(
                {
                    "id": molecule_id,
                    "name": "test molecule",
                    "pubchem_cid": 12345,
                    "molecular_weight": 100.5,
                    "harm_level": 2,
                    "is_heat_stable": True,
                    "is_neutralizable": False,
                }
            ),
            encoding="utf-8",
        )

        # Create a minimal food referencing the molecule
        food_id = "c3d4e5f6-a7b8-9012-cdef-123456789012"
        (foods_dir / "test_food.json").write_text(
            json.dumps(
                {
                    "id": food_id,
                    "name": "test food",
                    "category": "Test Category",
                    "origin": "Test Origin",
                    "overall_safety_score": 75,
                    "health_index": 82,
                    "molecules": [
                        {
                            "molecule_name": "test molecule",
                            "amount_per_100g": 50.25,
                            "unit": "mg",
                            "is_beneficial": True,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        yield seed_path


@pytest.mark.django_db
def test_seed_creates_molecules(temp_seed_dir):
    """Happy path: molecules are created from JSON files."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    assert Molecule.objects.count() == 1
    mol = Molecule.objects.get(name="test molecule")
    assert mol.pubchem_cid == 12345
    assert mol.molecular_weight == Decimal("100.5")
    assert mol.harm_level == 2
    assert mol.is_heat_stable is True
    assert mol.is_neutralizable is False


@pytest.mark.django_db
def test_seed_creates_foods_and_categories(temp_seed_dir):
    """Happy path: foods and categories are created from JSON files."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    assert FoodCategory.objects.count() == 1
    cat = FoodCategory.objects.get(name="Test Category")
    assert cat.description == ""

    assert Food.objects.count() == 1
    food = Food.objects.get(name="test food")
    assert food.origin == "Test Origin"
    assert food.overall_safety_score == 75
    assert food.health_index == 82
    assert food.category == cat


@pytest.mark.django_db
def test_seed_creates_food_molecule_links(temp_seed_dir):
    """Happy path: food-molecule relationships are created."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    assert FoodMolecule.objects.count() == 1
    fm = FoodMolecule.objects.first()
    assert fm.food.name == "test food"
    assert fm.molecule.name == "test molecule"
    assert fm.amount_per_100g == Decimal("50.25")
    assert fm.unit == "mg"
    assert fm.is_beneficial is True


@pytest.mark.django_db
def test_seed_normalizes_molecule_names_and_links(temp_seed_dir):
    """Molecule JSON and food link names use the same canonical form."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    mol_data = json.loads(mol_file.read_text(encoding="utf-8"))
    mol_data["name"] = " Test Molecule (total) "
    mol_file.write_text(json.dumps(mol_data), encoding="utf-8")

    food_file = temp_seed_dir / "foods" / "test_food.json"
    food_data = json.loads(food_file.read_text(encoding="utf-8"))
    food_data["molecules"][0]["molecule_name"] = "TEST MOLECULE"
    food_file.write_text(json.dumps(food_data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    molecule = Molecule.objects.get()
    assert molecule.name == "test molecule"
    assert FoodMolecule.objects.get().molecule == molecule


@pytest.mark.django_db
def test_seed_preserves_uuids(temp_seed_dir):
    """UUIDs from JSON files are used as primary keys."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    food = Food.objects.get(name="test food")
    assert food.id == UUID("c3d4e5f6-a7b8-9012-cdef-123456789012")

    mol = Molecule.objects.get(name="test molecule")
    assert mol.id == UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


@pytest.mark.django_db
def test_seed_is_idempotent(temp_seed_dir):
    """Running twice updates existing records rather than creating duplicates."""
    call_command("seed_data", "--path", str(temp_seed_dir))
    first_food_count = Food.objects.count()
    first_mol_count = Molecule.objects.count()
    first_fm_count = FoodMolecule.objects.count()
    first_cat_count = FoodCategory.objects.count()

    # Modify the JSON to change a field
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    data["origin"] = "Updated Origin"
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    assert Food.objects.count() == first_food_count
    assert Molecule.objects.count() == first_mol_count
    assert FoodMolecule.objects.count() == first_fm_count
    assert FoodCategory.objects.count() == first_cat_count

    food = Food.objects.get(name="test food")
    assert food.origin == "Updated Origin"


@pytest.mark.django_db
def test_seed_creates_by_name_when_id_missing(temp_seed_dir):
    """If a record exists by name but not by UUID, it updates by name."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    # Change the UUID in the JSON but keep the same name
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    data = json.loads(mol_file.read_text(encoding="utf-8"))
    new_id = "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    data["id"] = new_id
    data["pubchem_cid"] = 99999
    mol_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    # Should still have only 1 molecule, updated by name match
    assert Molecule.objects.count() == 1
    mol = Molecule.objects.get(name="test molecule")
    assert mol.pubchem_cid == 99999


@pytest.mark.django_db
def test_seed_updates_existing_molecule_by_case_insensitive_name(temp_seed_dir):
    """Existing molecules are reused even if their stored case differs."""
    existing = Molecule.objects.create(name="Test Molecule", pubchem_cid=111)

    call_command("seed_data", "--path", str(temp_seed_dir))

    assert Molecule.objects.count() == 1
    existing.refresh_from_db()
    assert existing.name == "test molecule"
    assert existing.pubchem_cid == 12345


@pytest.mark.django_db
def test_clear_flag_removes_existing_data(temp_seed_dir):
    """--clear removes all seed data before inserting."""
    call_command("seed_data", "--path", str(temp_seed_dir))
    assert Food.objects.count() == 1

    call_command("seed_data", "--path", str(temp_seed_dir), "--clear")
    # After clear + re-seed, should still have 1, but with fresh IDs
    assert Food.objects.count() == 1
    assert Molecule.objects.count() == 1


@pytest.mark.django_db
def test_clear_flag_deletes_all_seed_models(temp_seed_dir):
    """--clear deletes FoodMolecule, Food, Molecule, and FoodCategory records."""
    call_command("seed_data", "--path", str(temp_seed_dir))
    assert FoodMolecule.objects.count() == 1

    # Remove all JSON files to simulate clearing with nothing to re-seed
    for f in (temp_seed_dir / "molecules").glob("*.json"):
        f.unlink()
    for f in (temp_seed_dir / "foods").glob("*.json"):
        f.unlink()

    call_command("seed_data", "--path", str(temp_seed_dir), "--clear")
    assert Food.objects.count() == 0
    assert Molecule.objects.count() == 0
    assert FoodCategory.objects.count() == 0
    assert FoodMolecule.objects.count() == 0


@pytest.mark.django_db
def test_missing_molecule_reference_warns(temp_seed_dir, capsys):
    """If a food references a non-existent molecule, a warning is printed."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    data["molecules"][0]["molecule_name"] = "nonexistent molecule"
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    captured = capsys.readouterr()
    assert "nonexistent molecule" in captured.out
    assert "not found" in captured.out
    assert FoodMolecule.objects.count() == 0


@pytest.mark.django_db
def test_missing_molecules_directory_warns(temp_seed_dir, capsys):
    """If the molecules directory is missing, a warning is printed."""
    import shutil

    shutil.rmtree(temp_seed_dir / "molecules")

    call_command("seed_data", "--path", str(temp_seed_dir))

    captured = capsys.readouterr()
    assert "Molecules directory not found" in captured.out


@pytest.mark.django_db
def test_missing_foods_directory_warns(temp_seed_dir, capsys):
    """If the foods directory is missing, a warning is printed."""
    import shutil

    shutil.rmtree(temp_seed_dir / "foods")

    call_command("seed_data", "--path", str(temp_seed_dir))

    captured = capsys.readouterr()
    assert "Foods directory not found" in captured.out


@pytest.mark.django_db
def test_empty_directories_seed_no_data(temp_seed_dir):
    """Empty directories result in no seeded data."""
    for f in (temp_seed_dir / "molecules").glob("*.json"):
        f.unlink()
    for f in (temp_seed_dir / "foods").glob("*.json"):
        f.unlink()

    call_command("seed_data", "--path", str(temp_seed_dir))

    assert Molecule.objects.count() == 0
    assert Food.objects.count() == 0
    assert FoodCategory.objects.count() == 0
    assert FoodMolecule.objects.count() == 0


@pytest.mark.django_db
def test_null_decimal_fields_handled(temp_seed_dir):
    """Null decimal fields in JSON are properly stored as None."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    data = json.loads(mol_file.read_text(encoding="utf-8"))
    data["molecular_weight"] = None
    data["threshold_concern_mg_per_day"] = None
    mol_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    mol = Molecule.objects.get(name="test molecule")
    assert mol.molecular_weight is None
    assert mol.threshold_concern_mg_per_day is None


@pytest.mark.django_db
def test_food_molecule_null_amount_handled(temp_seed_dir):
    """Null amount_per_100g in food-molecule data is stored as None."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    data["molecules"][0]["amount_per_100g"] = None
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    fm = FoodMolecule.objects.first()
    assert fm.amount_per_100g is None


@pytest.mark.django_db
def test_boolean_fields_default_false(temp_seed_dir):
    """Boolean fields default to False when not specified in JSON."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    # Remove is_beneficial from molecule data
    del data["molecules"][0]["is_beneficial"]
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    fm = FoodMolecule.objects.first()
    assert fm.is_beneficial is False


@pytest.mark.django_db
def test_default_seed_path_uses_data_dir():
    """Without --path, the command uses data/seed relative to project root."""
    # This test verifies the default path resolution logic exists.
    # We cannot easily test the actual default path without the full seed data,
    # so we just verify the command accepts no --path argument and resolves.
    from core.management.commands.seed_data import Command

    cmd = Command()
    path = cmd._resolve_seed_path(None)
    assert "data" in str(path)
    assert "seed" in str(path)


@pytest.mark.django_db
def test_custom_path_override(temp_seed_dir):
    """--path overrides the default seed directory."""
    call_command("seed_data", "--path", str(temp_seed_dir))

    assert Molecule.objects.count() == 1
    assert Food.objects.count() == 1


@pytest.mark.django_db
def test_invalid_json_handled_gracefully(temp_seed_dir):
    """Invalid JSON in a seed file is logged and skipped, not raised."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    mol_file.write_text("not valid json", encoding="utf-8")

    from io import StringIO

    out = StringIO()
    call_command("seed_data", "--path", str(temp_seed_dir), stdout=out)
    output = out.getvalue()
    assert "Invalid JSON" in output
    assert "Seeded" in output  # Command completes successfully


@pytest.mark.django_db
def test_molecule_metadata_preserved(temp_seed_dir):
    """Metadata dict in molecule JSON is stored correctly."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    data = json.loads(mol_file.read_text(encoding="utf-8"))
    data["metadata"] = {"source": "test", "confidence": "high"}
    mol_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    mol = Molecule.objects.get(name="test molecule")
    assert mol.metadata == {"source": "test", "confidence": "high"}


@pytest.mark.django_db
def test_food_aliases_preserved(temp_seed_dir):
    """Aliases array in food JSON is stored correctly."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    data["aliases"] = ["alias1", "alias2"]
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    food = Food.objects.get(name="test food")
    assert food.aliases == ["alias1", "alias2"]


@pytest.mark.django_db
def test_category_reused_for_multiple_foods(temp_seed_dir):
    """Multiple foods with the same category share one FoodCategory record."""
    # Create a second food with the same category
    food2_id = "d4e5f6a7-b8c9-0123-defa-234567890123"
    (temp_seed_dir / "foods" / "test_food2.json").write_text(
        json.dumps(
            {
                "id": food2_id,
                "name": "test food 2",
                "category": "Test Category",
                "origin": "Another Origin",
                "molecules": [],
            }
        ),
        encoding="utf-8",
    )

    call_command("seed_data", "--path", str(temp_seed_dir))

    assert FoodCategory.objects.count() == 1
    assert Food.objects.count() == 2


@pytest.mark.django_db
def test_food_without_category(temp_seed_dir):
    """A food without a category field creates a Food with category=None."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    del data["category"]
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    food = Food.objects.get(name="test food")
    assert food.category is None
    assert FoodCategory.objects.count() == 0


@pytest.mark.django_db
def test_food_without_molecules(temp_seed_dir):
    """A food without molecules creates no FoodMolecule records."""
    food_file = temp_seed_dir / "foods" / "test_food.json"
    data = json.loads(food_file.read_text(encoding="utf-8"))
    data["molecules"] = []
    food_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    assert FoodMolecule.objects.count() == 0
    assert Food.objects.count() == 1


@pytest.mark.django_db
def test_decimal_precision_preserved(temp_seed_dir):
    """Decimal values within model precision are preserved accurately."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    data = json.loads(mol_file.read_text(encoding="utf-8"))
    data["molecular_weight"] = 123.4567
    mol_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    mol = Molecule.objects.get(name="test molecule")
    assert mol.molecular_weight == Decimal("123.4567")


@pytest.mark.django_db
def test_harm_mechanisms_array_preserved(temp_seed_dir):
    """Harm mechanisms array is stored correctly."""
    mol_file = temp_seed_dir / "molecules" / "test_mol.json"
    data = json.loads(mol_file.read_text(encoding="utf-8"))
    data["harm_mechanisms"] = ["mechanism1", "mechanism2"]
    mol_file.write_text(json.dumps(data), encoding="utf-8")

    call_command("seed_data", "--path", str(temp_seed_dir))

    mol = Molecule.objects.get(name="test molecule")
    assert mol.harm_mechanisms == ["mechanism1", "mechanism2"]
