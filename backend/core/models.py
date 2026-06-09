"""
nutrii — Django ORM Models

Phase 2: Full data architecture mirroring the schema defined in
IMPLEMENTATION_PLAN.md § Phase 2.

No user or auth models — the database is purely a scientific document store.
"""

from __future__ import annotations

import uuid

from django.db import models

from .fields import PortableArrayField as ArrayField


# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------


class FoodCategory(models.Model):
    """Top-level category tree for foods (e.g. 'Vegetables', 'Legumes')."""

    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "food categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ProcessingMethod(models.Model):
    """A food processing/neutralization method (e.g. boiling, fermenting)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    mechanism = models.TextField(blank=True)
    typical_temperature_c = models.SmallIntegerField(null=True, blank=True)
    typical_duration_min = models.SmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# Core entities
# ---------------------------------------------------------------------------


class Food(models.Model):
    """A food ingredient — the central entity in nutrii."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    aliases = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        default=list,
        help_text="Alternative names for fuzzy search and deduplication.",
    )
    category = models.ForeignKey(
        FoodCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="foods",
    )
    origin = models.CharField(max_length=255, blank=True)
    overall_safety_score = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="0–100. Updated automatically by AI agents.",
    )
    health_index = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="nutrii Health Index (NHI). 0–100. Updated by AI agents.",
    )
    ban_listed = models.BooleanField(default=False)
    image_url = models.TextField(blank=True)
    # Flexible JSONB field: source attribution, external IDs, confidence, etc.
    metadata = models.JSONField(default=dict, blank=True)
    ai_guide_version = models.IntegerField(
        null=True,
        blank=True,
        help_text="Current active version of the agent instruction guide.",
    )
    last_analyzed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the AI last reviewed this food.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Many-to-many through food_molecules junction
    molecules = models.ManyToManyField(
        "Molecule",
        through="FoodMolecule",
        related_name="foods",
        blank=True,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            # GIN index for aliases array — defined in migration
            models.Index(fields=["name"], name="idx_food_name"),
            models.Index(fields=["ban_listed"], name="idx_food_ban_listed"),
            models.Index(fields=["health_index"], name="idx_food_health_index"),
        ]

    def __str__(self) -> str:
        return self.name


class Molecule(models.Model):
    """A chemical molecule or compound found in food."""

    HARM_LEVEL_CHOICES = [
        (0, "None"),
        (1, "Negligible"),
        (2, "Low"),
        (3, "Moderate"),
        (4, "High"),
        (5, "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pubchem_cid = models.BigIntegerField(unique=True, null=True, blank=True)
    name = models.CharField(max_length=255, unique=True)
    iupac_name = models.CharField(max_length=500, blank=True)
    cas_number = models.CharField(max_length=50, blank=True)
    molecular_formula = models.CharField(max_length=100, blank=True)
    molecular_weight = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True
    )
    harm_level = models.SmallIntegerField(
        choices=HARM_LEVEL_CHOICES,
        default=0,
        help_text="0–5. Auto-adjusted by AI from new studies.",
    )
    harm_mechanisms = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        default=list,
        help_text="Plain-language harm mechanism tags.",
    )
    classification_reasoning = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured AI rationale for the harm classification.",
    )
    threshold_concern_mg_per_day = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True
    )
    is_heat_stable = models.BooleanField(default=True)
    is_neutralizable = models.BooleanField(default=False)
    structure_image_url = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    neutralization_methods = models.ManyToManyField(
        ProcessingMethod,
        through="MoleculeNeutralization",
        related_name="molecules",
        blank=True,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["pubchem_cid"], name="idx_molecule_pubchem_cid"),
            models.Index(fields=["cas_number"], name="idx_molecule_cas"),
            models.Index(fields=["harm_level"], name="idx_molecule_harm_level"),
        ]

    def __str__(self) -> str:
        return self.name


class Study(models.Model):
    """A PubMed study, analyzed by the nutrii AI pipeline."""

    CONFIDENCE_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pmid = models.CharField(max_length=20, unique=True)
    title = models.TextField()
    authors = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        default=list,
    )
    journal = models.CharField(max_length=255, blank=True)
    publication_year = models.SmallIntegerField(null=True, blank=True)
    url = models.TextField(blank=True)
    abstract = models.TextField(blank=True)
    # AI-generated fields (populated by Phase 5 pipeline)
    ai_summary = models.TextField(blank=True)
    ai_safety_impact = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="−5 to +5. AI-assessed impact on safety perception.",
    )
    ai_health_impact = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="−5 to +5. AI-assessed impact on health perception.",
    )
    ai_confidence = models.CharField(
        max_length=20, choices=CONFIDENCE_CHOICES, blank=True
    )
    ai_model_used = models.CharField(max_length=100, blank=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-publication_year", "title"]
        verbose_name_plural = "studies"

    def __str__(self) -> str:
        return f"PMID:{self.pmid} — {self.title[:80]}"


# ---------------------------------------------------------------------------
# Junction tables
# ---------------------------------------------------------------------------


class FoodMolecule(models.Model):
    """Junction: which molecules are present in which foods, with amounts."""

    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    molecule = models.ForeignKey(Molecule, on_delete=models.CASCADE)
    amount_per_100g = models.DecimalField(
        max_digits=12, decimal_places=6, null=True, blank=True
    )
    unit = models.CharField(
        max_length=20,
        blank=True,
        help_text="mg, µg, g, IU, etc.",
    )
    amount_notes = models.TextField(
        blank=True,
        help_text='e.g. "varies by cultivar"',
    )
    is_beneficial = models.BooleanField(
        default=False,
        help_text="Context-dependent: is this molecule a net benefit for this food?",
    )

    class Meta:
        unique_together = [("food", "molecule")]
        verbose_name = "food–molecule link"


class FoodStudy(models.Model):
    """Junction: which studies are relevant to which foods."""

    LINKED_BY_CHOICES = [
        ("auto_ingestion", "Auto Ingestion"),
        ("ai_cross_reference", "AI Cross-Reference"),
    ]

    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    study = models.ForeignKey(Study, on_delete=models.CASCADE)
    relevance_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="0.00–1.00. How relevant is this study to this food?",
    )
    linked_by = models.CharField(
        max_length=50, choices=LINKED_BY_CHOICES, default="auto_ingestion"
    )

    class Meta:
        unique_together = [("food", "study")]
        verbose_name = "food–study link"


class MoleculeNeutralization(models.Model):
    """Junction: how a processing method reduces a harmful molecule's impact."""

    CONFIDENCE_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    molecule = models.ForeignKey(Molecule, on_delete=models.CASCADE)
    method = models.ForeignKey(ProcessingMethod, on_delete=models.CASCADE)
    reduction_percent_min = models.SmallIntegerField(
        null=True, blank=True, help_text="Minimum reduction percentage (0–100)."
    )
    reduction_percent_max = models.SmallIntegerField(
        null=True, blank=True, help_text="Maximum reduction percentage (0–100)."
    )
    time_required = models.CharField(
        max_length=100,
        blank=True,
        help_text='Human-readable time, e.g. "10–30 minutes".',
    )
    notes = models.TextField(
        blank=True, help_text='e.g. "Discard soaking water after use."'
    )
    evidence_refs = ArrayField(
        models.CharField(max_length=20),
        blank=True,
        default=list,
        help_text="PubMed PMIDs supporting this claim.",
    )
    confidence = models.CharField(
        max_length=20, choices=CONFIDENCE_CHOICES, default="medium"
    )

    class Meta:
        unique_together = [("molecule", "method")]
        verbose_name = "molecule neutralization"


# ---------------------------------------------------------------------------
# Audit & AI-generated tables
# ---------------------------------------------------------------------------


class SafetyScoreRevision(models.Model):
    """Full audit trail of every AI-driven safety score change."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    food = models.ForeignKey(
        Food, on_delete=models.CASCADE, related_name="score_revisions"
    )
    old_safety_score = models.SmallIntegerField(null=True, blank=True)
    new_safety_score = models.SmallIntegerField(null=True, blank=True)
    old_health_index = models.SmallIntegerField(null=True, blank=True)
    new_health_index = models.SmallIntegerField(null=True, blank=True)
    reason = models.TextField(help_text="AI-generated explanation for the change.")
    triggering_study = models.ForeignKey(
        Study,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="triggered_revisions",
    )
    ai_model_used = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "safety score revision"

    def __str__(self) -> str:
        return (
            f"{self.food.name}: "
            f"{self.old_safety_score}→{self.new_safety_score} "
            f"({self.created_at.date()})"
        )


class IngredientAIGuide(models.Model):
    """Agent instruction guide governing how AI analyzes a specific ingredient."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    food = models.ForeignKey(
        Food,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_guides",
    )
    molecule = models.ForeignKey(
        Molecule,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_guides",
    )
    guide_markdown = models.TextField()
    version = models.IntegerField(default=1)
    generated_by = models.CharField(
        max_length=100, blank=True, help_text="OpenRouter model name."
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        verbose_name = "ingredient AI guide"

    def __str__(self) -> str:
        target = self.food or self.molecule
        return f"Guide v{self.version} for {target}"


class BanListEntry(models.Model):
    """Foods that cannot be made safe — and their regulatory status by jurisdiction."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    food = models.OneToOneField(
        Food,
        on_delete=models.CASCADE,
        related_name="ban_entry",
    )
    reason = models.TextField()
    lethal_dose_mg = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True
    )
    is_conditionally_safe = models.BooleanField(default=False)
    safe_condition = models.TextField(
        blank=True, help_text="Condition under which this food may be consumed safely."
    )
    # e.g. {"EU": {"status": "banned", "regulation": "EC 1333/2008"}, ...}
    regulatory_status = models.JSONField(
        default=dict,
        blank=True,
        help_text="Per-jurisdiction regulatory status as JSONB.",
    )

    class Meta:
        verbose_name = "ban list entry"
        verbose_name_plural = "ban list entries"

    def __str__(self) -> str:
        return f"BAN: {self.food.name}"
