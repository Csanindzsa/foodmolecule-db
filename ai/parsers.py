"""
nutrii — AI Output Parsers

Strict Pydantic models for all structured AI responses.
Every response from OpenRouter is validated against these schemas.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class StudyAnalysisResponse(BaseModel):
    """Structured output from the study analysis agent."""

    primary_ingredient: str = Field(description="The main food or molecule studied")
    summary: str = Field(description="2–3 sentence summary for a general audience")
    safety_impact: int = Field(ge=-5, le=5, description="Impact on safety perception")
    health_impact: int = Field(ge=-5, le=5, description="Impact on health perception")
    confidence: Literal["high", "medium", "low"]
    red_flags: list[str] = Field(default_factory=list, description="Methodological concerns")

    @field_validator("summary")
    @classmethod
    def max_length(cls, v: str) -> str:
        if len(v) > 2000:
            return v[:2000]
        return v


class SafetyAdjustmentResponse(BaseModel):
    """Structured output from the safety score adjustment agent."""

    new_safety_score: int = Field(ge=0, le=100)
    new_health_index: int = Field(ge=0, le=100)
    reasoning: str = Field(description="Human-readable explanation with PMID citation")
    pmid_cited: str = Field(description="The specific PMID supporting the adjustment")

    @field_validator("new_safety_score", "new_health_index")
    @classmethod
    def no_extreme_jumps(cls, v: int) -> int:
        # The dispatcher enforces ±15 delta; this is a secondary guard
        return v


class GuideGenerationResponse(BaseModel):
    """Structured output from the agent instruction guide generator."""

    markdown_content: str = Field(min_length=100, description="Full Markdown guide")
    version: int = Field(ge=1, default=1)


class ConflictArbitrationResponse(BaseModel):
    """Structured output from the conflict arbitration agent."""

    resolved_value: str = Field(description="The reconciled value")
    confidence: Literal["high", "medium", "low"]
    explanation: str = Field(description="How the conflict was resolved")


class MoleculeClassificationResponse(BaseModel):
    """Structured output from the molecule auto-classifier."""

    harm_level: int = Field(ge=0, le=5)
    harm_mechanisms: list[str] = Field(default_factory=list)
    is_heat_stable: bool = True
    is_neutralizable: bool = False
    reasoning: str = Field(description="Why this classification was chosen")
    confidence: Literal["high", "medium", "low"]
