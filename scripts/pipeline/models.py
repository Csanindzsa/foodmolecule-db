"""
Pydantic models for data flowing through the nutrii ingestion pipeline.

These mirror the JSON Schema files and the Django ORM models.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class MoleculeEntry(BaseModel):
    """A molecule/compound to be ingested."""

    id: UUID = Field(default_factory=uuid4)
    pubchem_cid: int | None = None
    name: str
    iupac_name: str = ""
    cas_number: str = ""
    molecular_formula: str = ""
    molecular_weight: float | None = None
    harm_level: int = Field(default=0, ge=0, le=5)
    harm_mechanisms: list[str] = Field(default_factory=list)
    classification_reasoning: dict = Field(default_factory=dict)
    threshold_concern_mg_per_day: float | None = None
    is_heat_stable: bool = True
    is_neutralizable: bool = False
    structure_image_url: str = ""
    metadata: dict = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip().lower()


class FoodMoleculeLink(BaseModel):
    """Link between a food and a molecule with amount info."""

    molecule_name: str
    amount_per_100g: float | None = None
    unit: str = "mg"
    amount_notes: str = ""
    is_beneficial: bool = False


class FoodEntry(BaseModel):
    """A food ingredient to be ingested."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    aliases: list[str] = Field(default_factory=list)
    category: str = ""
    origin: str = ""
    overall_safety_score: int | None = Field(default=None, ge=0, le=100)
    health_index: int | None = Field(default=None, ge=0, le=100)
    ban_listed: bool = False
    image_url: str = ""
    metadata: dict = Field(default_factory=dict)
    molecules: list[FoodMoleculeLink] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("aliases")
    @classmethod
    def normalize_aliases(cls, v: list[str]) -> list[str]:
        return [a.strip().lower() for a in v if a.strip()]


class StudyEntry(BaseModel):
    """A PubMed study to be ingested."""

    id: UUID = Field(default_factory=uuid4)
    pmid: str
    title: str
    authors: list[str] = Field(default_factory=list)
    journal: str = ""
    publication_year: int | None = Field(default=None, ge=1900, le=2100)
    url: str = ""
    abstract: str = ""
    ai_summary: str | None = None
    ai_safety_impact: int | None = Field(default=None, ge=-5, le=5)
    ai_health_impact: int | None = Field(default=None, ge=-5, le=5)
    ai_confidence: Literal["high", "medium", "low"] | None = None
    ai_model_used: str | None = None
    analyzed_at: str | None = None


class BanListEntry(BaseModel):
    """A ban-list entry to be ingested."""

    food_name: str
    reason: str
    lethal_dose_mg: float | None = None
    is_conditionally_safe: bool = False
    safe_condition: str = ""
    regulatory_status: dict = Field(default_factory=dict)
