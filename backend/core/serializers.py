"""
DRF serializers for nutrii API.

Phase 10 deliverable — full serializer implementations.
Stubs created in Phase 2 to complete the project structure.
"""

from rest_framework import serializers

from .models import (
    BanListEntry,
    Food,
    FoodCategory,
    FoodMolecule,
    FoodStudy,
    IngredientAIGuide,
    Molecule,
    MoleculeNeutralization,
    ProcessingMethod,
    SafetyScoreRevision,
    Study,
)


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = ["id", "name", "parent", "description"]


class MoleculeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Molecule
        fields = [
            "id",
            "pubchem_cid",
            "name",
            "iupac_name",
            "cas_number",
            "molecular_formula",
            "molecular_weight",
            "harm_level",
            "harm_mechanisms",
            "is_heat_stable",
            "is_neutralizable",
            "structure_image_url",
        ]


class FoodMoleculeSerializer(serializers.ModelSerializer):
    molecule = MoleculeSerializer(read_only=True)

    class Meta:
        model = FoodMolecule
        fields = ["molecule", "amount_per_100g", "unit", "amount_notes", "is_beneficial"]


class StudySerializer(serializers.ModelSerializer):
    class Meta:
        model = Study
        fields = [
            "id",
            "pmid",
            "title",
            "authors",
            "journal",
            "publication_year",
            "url",
            "abstract",
            "ai_summary",
            "ai_safety_impact",
            "ai_health_impact",
            "ai_confidence",
            "ai_model_used",
            "analyzed_at",
        ]


class FoodStudySerializer(serializers.ModelSerializer):
    study = StudySerializer(read_only=True)

    class Meta:
        model = FoodStudy
        fields = ["study", "relevance_score", "linked_by"]


class IngredientAIGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngredientAIGuide
        fields = ["id", "food", "molecule", "guide_markdown", "version", "generated_by", "generated_at"]


class SafetyScoreRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyScoreRevision
        fields = [
            "id",
            "old_safety_score",
            "new_safety_score",
            "old_health_index",
            "new_health_index",
            "reason",
            "triggering_study",
            "ai_model_used",
            "created_at",
        ]


class BanListFoodSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", allow_null=True, read_only=True)

    class Meta:
        model = Food
        fields = ["id", "name", "category", "health_index"]


class BanListEntrySerializer(serializers.ModelSerializer):
    food = BanListFoodSerializer(read_only=True)

    class Meta:
        model = BanListEntry
        fields = ["id", "food", "reason", "lethal_dose_mg", "is_conditionally_safe", "safe_condition", "regulatory_status"]


class ProcessingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingMethod
        fields = ["id", "name", "description", "mechanism", "typical_temperature_c", "typical_duration_min"]


class MoleculeNeutralizationSerializer(serializers.ModelSerializer):
    method = ProcessingMethodSerializer(read_only=True)

    class Meta:
        model = MoleculeNeutralization
        fields = ["method", "reduction_percent_min", "reduction_percent_max", "time_required", "notes", "evidence_refs", "confidence"]


class MoleculeFoodSerializer(serializers.ModelSerializer):
    """Lightweight food reference for molecule detail page."""
    id = serializers.UUIDField(source="food.id", read_only=True)
    name = serializers.CharField(source="food.name", read_only=True)
    category = serializers.CharField(source="food.category.name", read_only=True, allow_null=True)

    class Meta:
        model = FoodMolecule
        fields = ["id", "name", "category", "amount_per_100g", "unit", "amount_notes", "is_beneficial"]


class MoleculeDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for molecule detail page.
    Does NOT modify the shared MoleculeSerializer used by list/search views."""
    neutralization_methods = MoleculeNeutralizationSerializer(
        source="moleculeneutralization_set", many=True, read_only=True
    )
    foods = MoleculeFoodSerializer(source="foodmolecule_set", many=True, read_only=True)

    class Meta:
        model = Molecule
        fields = [
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
        ]


class FoodListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, allow_null=True)
    molecule_ids = serializers.SerializerMethodField()
    molecule_names = serializers.SerializerMethodField()
    max_molecule_harm = serializers.SerializerMethodField()

    def _food_molecules(self, obj):
        return list(obj.foodmolecule_set.all())

    def get_molecule_ids(self, obj):
        return [str(food_molecule.molecule_id) for food_molecule in self._food_molecules(obj)]

    def get_molecule_names(self, obj):
        return [food_molecule.molecule.name for food_molecule in self._food_molecules(obj)]

    def get_max_molecule_harm(self, obj):
        harms = [
            food_molecule.molecule.harm_level
            for food_molecule in self._food_molecules(obj)
            if food_molecule.molecule and food_molecule.molecule.harm_level is not None
        ]
        return max(harms) if harms else 0

    class Meta:
        model = Food
        fields = [
            "id",
            "name",
            "category",
            "category_name",
            "overall_safety_score",
            "health_index",
            "ban_listed",
            "image_url",
            "molecule_ids",
            "molecule_names",
            "max_molecule_harm",
            "metadata",
        ]


class FoodDetailSerializer(serializers.ModelSerializer):
    molecules = FoodMoleculeSerializer(source="foodmolecule_set", many=True, read_only=True)
    score_revisions = SafetyScoreRevisionSerializer(many=True, read_only=True)
    ai_guides = IngredientAIGuideSerializer(many=True, read_only=True)

    class Meta:
        model = Food
        fields = [
            "id",
            "name",
            "aliases",
            "category",
            "origin",
            "overall_safety_score",
            "health_index",
            "ban_listed",
            "image_url",
            "metadata",
            "ai_guide_version",
            "last_analyzed_at",
            "molecules",
            "score_revisions",
            "ai_guides",
            "created_at",
            "updated_at",
        ]
