"""
Tests for MoleculeDetailSerializer and related serializers.

Validates:
- Serializer field existence and types match expected schema
- Nested serializers produce correct structure
- MoleculeDetailView correctly uses serializer_class
"""

import pytest
from decimal import Decimal

from core.models import (
    Food,
    FoodCategory,
    FoodMolecule,
    Molecule,
    MoleculeNeutralization,
    ProcessingMethod,
)
from core.serializers import (
    MoleculeDetailSerializer,
    MoleculeFoodSerializer,
    MoleculeNeutralizationSerializer,
    ProcessingMethodSerializer,
)
from core.views import MoleculeDetailView


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def processing_method():
    return ProcessingMethod.objects.create(
        name="Boiling",
        description="Heat in water",
        mechanism="Thermal decomposition",
        typical_temperature_c=100,
        typical_duration_min=15,
    )


@pytest.fixture
def molecule():
    return Molecule.objects.create(
        name="Oxalic Acid",
        pubchem_cid=971,
        iupac_name="Oxalic acid",
        cas_number="144-62-7",
        molecular_formula="C2H2O4",
        molecular_weight=Decimal("90.0340"),
        harm_level=3,
        harm_mechanisms=["kidney stones", "mineral absorption blocker"],
        threshold_concern_mg_per_day=Decimal("50.0000"),
        is_heat_stable=False,
        is_neutralizable=True,
        structure_image_url="https://example.com/oxalic.png",
        metadata={"source": "pubchem"},
    )


@pytest.fixture
def food_category():
    return FoodCategory.objects.create(name="Vegetables")


@pytest.fixture
def food(food_category):
    return Food.objects.create(
        name="Spinach",
        category=food_category,
        overall_safety_score=75,
        health_index=82,
    )


@pytest.fixture
def food_molecule(molecule, food):
    return FoodMolecule.objects.create(
        food=food,
        molecule=molecule,
        amount_per_100g=Decimal("2.700000"),
        unit="mg",
        amount_notes="Varies by cultivar",
        is_beneficial=False,
    )


@pytest.fixture
def molecule_neutralization(molecule, processing_method):
    return MoleculeNeutralization.objects.create(
        molecule=molecule,
        method=processing_method,
        reduction_percent_min=30,
        reduction_percent_max=90,
        time_required="10–30 minutes",
        notes="Discard soaking water after use.",
        evidence_refs=["12345678", "87654321"],
        confidence="high",
    )


# ---------------------------------------------------------------------------
# MoleculeNeutralizationSerializer tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_molecule_neutralization_serializer_fields_exist(molecule_neutralization):
    serializer = MoleculeNeutralizationSerializer(molecule_neutralization)
    data = serializer.data

    expected_fields = {
        "method",
        "reduction_percent_min",
        "reduction_percent_max",
        "time_required",
        "notes",
        "evidence_refs",
        "confidence",
    }
    assert set(data.keys()) == expected_fields


@pytest.mark.django_db
def test_molecule_neutralization_serializer_field_types(molecule_neutralization):
    serializer = MoleculeNeutralizationSerializer(molecule_neutralization)
    data = serializer.data

    assert isinstance(data["method"], dict)
    assert data["reduction_percent_min"] == 30
    assert data["reduction_percent_max"] == 90
    assert data["time_required"] == "10–30 minutes"
    assert data["notes"] == "Discard soaking water after use."
    assert data["evidence_refs"] == ["12345678", "87654321"]
    assert data["confidence"] == "high"


@pytest.mark.django_db
def test_molecule_neutralization_serializer_nested_method(
    molecule_neutralization, processing_method
):
    serializer = MoleculeNeutralizationSerializer(molecule_neutralization)
    data = serializer.data

    method_data = data["method"]
    assert method_data["id"] == processing_method.id
    assert method_data["name"] == "Boiling"
    assert method_data["description"] == "Heat in water"
    assert method_data["mechanism"] == "Thermal decomposition"
    assert method_data["typical_temperature_c"] == 100
    assert method_data["typical_duration_min"] == 15


@pytest.mark.django_db
def test_molecule_neutralization_serializer_null_reduction():
    method = ProcessingMethod.objects.create(name="Fermenting")
    molecule = Molecule.objects.create(name="Test Molecule")
    mn = MoleculeNeutralization.objects.create(
        molecule=molecule,
        method=method,
        reduction_percent_min=None,
        reduction_percent_max=None,
    )
    serializer = MoleculeNeutralizationSerializer(mn)
    data = serializer.data

    assert data["reduction_percent_min"] is None
    assert data["reduction_percent_max"] is None
    assert data["time_required"] == ""
    assert data["notes"] == ""
    assert data["evidence_refs"] == []
    assert data["confidence"] == "medium"


# ---------------------------------------------------------------------------
# MoleculeFoodSerializer tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_molecule_food_serializer_fields_exist(food_molecule):
    serializer = MoleculeFoodSerializer(food_molecule)
    data = serializer.data

    expected_fields = {
        "id",
        "name",
        "category",
        "amount_per_100g",
        "unit",
        "amount_notes",
        "is_beneficial",
    }
    assert set(data.keys()) == expected_fields


@pytest.mark.django_db
def test_molecule_food_serializer_field_values(food_molecule, food, food_category):
    serializer = MoleculeFoodSerializer(food_molecule)
    data = serializer.data

    assert data["id"] == str(food.id)
    assert data["name"] == "Spinach"
    assert data["category"] == "Vegetables"
    assert data["amount_per_100g"] == "2.700000"
    assert data["unit"] == "mg"
    assert data["amount_notes"] == "Varies by cultivar"
    assert data["is_beneficial"] is False


@pytest.mark.django_db
def test_molecule_food_serializer_null_category():
    food_no_cat = Food.objects.create(name="Generic Food")
    molecule = Molecule.objects.create(name="Test Mol")
    fm = FoodMolecule.objects.create(food=food_no_cat, molecule=molecule)
    serializer = MoleculeFoodSerializer(fm)
    data = serializer.data

    assert data["category"] is None
    assert data["id"] == str(food_no_cat.id)
    assert data["name"] == "Generic Food"


@pytest.mark.django_db
def test_molecule_food_serializer_beneficial_true():
    food = Food.objects.create(name="Lentils")
    molecule = Molecule.objects.create(name="Iron")
    fm = FoodMolecule.objects.create(food=food, molecule=molecule, is_beneficial=True)
    serializer = MoleculeFoodSerializer(fm)
    data = serializer.data

    assert data["is_beneficial"] is True


# ---------------------------------------------------------------------------
# MoleculeDetailSerializer tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_molecule_detail_serializer_fields_exist(molecule):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    expected_fields = {
        "id",
        "pubchem_cid",
        "name",
        "iupac_name",
        "cas_number",
        "molecular_formula",
        "molecular_weight",
        "harm_level",
        "harm_mechanisms",
        "threshold_concern_mg_per_day",
        "is_heat_stable",
        "is_neutralizable",
        "structure_image_url",
        "metadata",
        "neutralization_methods",
        "foods",
    }
    assert set(data.keys()) == expected_fields


@pytest.mark.django_db
def test_molecule_detail_serializer_basic_fields(molecule):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert data["id"] == str(molecule.id)
    assert data["pubchem_cid"] == 971
    assert data["name"] == "Oxalic Acid"
    assert data["iupac_name"] == "Oxalic acid"
    assert data["cas_number"] == "144-62-7"
    assert data["molecular_formula"] == "C2H2O4"
    assert data["molecular_weight"] == "90.0340"
    assert data["harm_level"] == 3
    assert data["harm_mechanisms"] == ["kidney stones", "mineral absorption blocker"]
    assert data["threshold_concern_mg_per_day"] == "50.0000"
    assert data["is_heat_stable"] is False
    assert data["is_neutralizable"] is True
    assert data["structure_image_url"] == "https://example.com/oxalic.png"
    assert data["metadata"] == {"source": "pubchem"}


@pytest.mark.django_db
def test_molecule_detail_serializer_empty_collections(molecule):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert data["neutralization_methods"] == []
    assert data["foods"] == []


@pytest.mark.django_db
def test_molecule_detail_serializer_with_neutralization(
    molecule, molecule_neutralization, processing_method
):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert len(data["neutralization_methods"]) == 1
    neutral = data["neutralization_methods"][0]
    assert neutral["method"]["name"] == "Boiling"
    assert neutral["reduction_percent_min"] == 30
    assert neutral["reduction_percent_max"] == 90
    assert neutral["confidence"] == "high"


@pytest.mark.django_db
def test_molecule_detail_serializer_with_food(
    molecule, food_molecule, food, food_category
):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert len(data["foods"]) == 1
    food_data = data["foods"][0]
    assert food_data["id"] == str(food.id)
    assert food_data["name"] == "Spinach"
    assert food_data["category"] == "Vegetables"
    assert food_data["amount_per_100g"] == "2.700000"
    assert food_data["unit"] == "mg"
    assert food_data["is_beneficial"] is False


@pytest.mark.django_db
def test_molecule_detail_serializer_multiple_neutralizations(molecule):
    method1 = ProcessingMethod.objects.create(name="Boiling")
    method2 = ProcessingMethod.objects.create(name="Fermenting")
    MoleculeNeutralization.objects.create(molecule=molecule, method=method1)
    MoleculeNeutralization.objects.create(molecule=molecule, method=method2)

    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert len(data["neutralization_methods"]) == 2
    method_names = {n["method"]["name"] for n in data["neutralization_methods"]}
    assert method_names == {"Boiling", "Fermenting"}


@pytest.mark.django_db
def test_molecule_detail_serializer_multiple_foods(molecule):
    food1 = Food.objects.create(name="Spinach")
    food2 = Food.objects.create(name="Beet Greens")
    FoodMolecule.objects.create(food=food1, molecule=molecule)
    FoodMolecule.objects.create(food=food2, molecule=molecule)

    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert len(data["foods"]) == 2
    food_names = {f["name"] for f in data["foods"]}
    assert food_names == {"Spinach", "Beet Greens"}


@pytest.mark.django_db
def test_molecule_detail_serializer_full_data(
    molecule, food_molecule, molecule_neutralization
):
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    # Verify all top-level fields are present and correct
    assert data["name"] == "Oxalic Acid"
    assert len(data["neutralization_methods"]) == 1
    assert len(data["foods"]) == 1

    # Verify nested structure integrity
    neutral = data["neutralization_methods"][0]
    assert "method" in neutral
    assert "reduction_percent_min" in neutral
    assert "reduction_percent_max" in neutral

    food = data["foods"][0]
    assert "id" in food
    assert "name" in food
    assert "category" in food
    assert "amount_per_100g" in food


# ---------------------------------------------------------------------------
# MoleculeDetailView tests
# ---------------------------------------------------------------------------


def test_molecule_detail_view_serializer_class():
    assert MoleculeDetailView.serializer_class == MoleculeDetailSerializer


def test_molecule_detail_view_is_retrieve_api_view():
    from rest_framework import generics
    assert issubclass(MoleculeDetailView, generics.RetrieveAPIView)


@pytest.mark.django_db
def test_molecule_detail_view_queryset_prefetch(molecule, food, food_molecule, processing_method, molecule_neutralization):
    """Verify the view's queryset configuration includes required prefetch."""
    view = MoleculeDetailView()
    queryset = view.get_queryset()
    
    # Should not raise — verifies prefetch_related fields exist
    str(queryset.query)
    
    # Verify the queryset can be evaluated and returns the molecule
    result = list(queryset.filter(id=molecule.id))
    assert len(result) == 1
    assert result[0].id == molecule.id


# ---------------------------------------------------------------------------
# Edge case / boundary tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_molecule_food_serializer_zero_amount():
    food = Food.objects.create(name="Test Food")
    molecule = Molecule.objects.create(name="Trace Molecule")
    fm = FoodMolecule.objects.create(
        food=food,
        molecule=molecule,
        amount_per_100g=Decimal("0.000000"),
        unit="µg",
    )
    serializer = MoleculeFoodSerializer(fm)
    data = serializer.data

    assert data["amount_per_100g"] == "0.000000"
    assert data["unit"] == "µg"


@pytest.mark.django_db
def test_molecule_neutralization_serializer_zero_reduction():
    method = ProcessingMethod.objects.create(name="Washing")
    molecule = Molecule.objects.create(name="Surface Pesticide")
    mn = MoleculeNeutralization.objects.create(
        molecule=molecule,
        method=method,
        reduction_percent_min=0,
        reduction_percent_max=0,
    )
    serializer = MoleculeNeutralizationSerializer(mn)
    data = serializer.data

    assert data["reduction_percent_min"] == 0
    assert data["reduction_percent_max"] == 0


@pytest.mark.django_db
def test_molecule_detail_serializer_null_optional_fields():
    molecule = Molecule.objects.create(
        name="Minimal Molecule",
        pubchem_cid=None,
        iupac_name="",
        cas_number="",
        molecular_formula="",
        molecular_weight=None,
        threshold_concern_mg_per_day=None,
        structure_image_url="",
    )
    serializer = MoleculeDetailSerializer(molecule)
    data = serializer.data

    assert data["pubchem_cid"] is None
    assert data["iupac_name"] == ""
    assert data["cas_number"] == ""
    assert data["molecular_formula"] == ""
    assert data["molecular_weight"] is None
    assert data["threshold_concern_mg_per_day"] is None
    assert data["structure_image_url"] == ""
    assert data["neutralization_methods"] == []
    assert data["foods"] == []
