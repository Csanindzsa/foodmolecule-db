from django.contrib import admin

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


@admin.register(FoodCategory)
class FoodCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent"]
    search_fields = ["name"]


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "overall_safety_score",
        "health_index",
        "ban_listed",
        "last_analyzed_at",
    ]
    list_filter = ["category", "ban_listed"]
    search_fields = ["name", "aliases"]
    readonly_fields = ["created_at", "updated_at", "last_analyzed_at"]


@admin.register(Molecule)
class MoleculeAdmin(admin.ModelAdmin):
    list_display = ["name", "harm_level", "pubchem_cid", "cas_number"]
    list_filter = ["harm_level", "is_heat_stable", "is_neutralizable"]
    search_fields = ["name", "pubchem_cid", "cas_number"]


@admin.register(Study)
class StudyAdmin(admin.ModelAdmin):
    list_display = ["pmid", "title", "publication_year", "ai_confidence", "analyzed_at"]
    list_filter = ["ai_confidence", "publication_year"]
    search_fields = ["pmid", "title", "abstract"]
    readonly_fields = ["created_at"]


@admin.register(SafetyScoreRevision)
class SafetyScoreRevisionAdmin(admin.ModelAdmin):
    list_display = ["food", "old_safety_score", "new_safety_score", "ai_model_used", "created_at"]
    list_filter = ["ai_model_used"]
    readonly_fields = ["created_at"]


@admin.register(IngredientAIGuide)
class IngredientAIGuideAdmin(admin.ModelAdmin):
    list_display = ["food", "molecule", "version", "generated_by", "generated_at"]
    readonly_fields = ["generated_at"]


@admin.register(BanListEntry)
class BanListEntryAdmin(admin.ModelAdmin):
    list_display = ["food", "is_conditionally_safe", "lethal_dose_mg"]
    list_filter = ["is_conditionally_safe"]


@admin.register(ProcessingMethod)
class ProcessingMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "typical_temperature_c", "typical_duration_min"]
    search_fields = ["name"]


@admin.register(FoodMolecule)
class FoodMoleculeAdmin(admin.ModelAdmin):
    list_display = ["food", "molecule", "amount_per_100g", "unit", "is_beneficial"]
    list_filter = ["is_beneficial"]
    search_fields = ["food__name", "molecule__name"]


@admin.register(MoleculeNeutralization)
class MoleculeNeutralizationAdmin(admin.ModelAdmin):
    list_display = ["molecule", "method", "reduction_percent_min", "reduction_percent_max", "confidence"]
    list_filter = ["confidence"]


@admin.register(FoodStudy)
class FoodStudyAdmin(admin.ModelAdmin):
    list_display = ["food", "study", "relevance_score", "linked_by"]
    list_filter = ["linked_by"]
