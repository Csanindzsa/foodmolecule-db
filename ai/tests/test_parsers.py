"""
Tests for AI output parsers.
"""

import pytest
from pydantic import ValidationError

from ai.parsers import (
    ConflictArbitrationResponse,
    GuideGenerationResponse,
    MoleculeClassificationResponse,
    SafetyAdjustmentResponse,
    StudyAnalysisResponse,
)


class TestStudyAnalysisResponse:
    def test_valid(self):
        data = {
            "primary_ingredient": "spinach",
            "summary": "This study found that spinach consumption reduces oxidative stress.",
            "safety_impact": 2,
            "health_impact": 3,
            "confidence": "high",
            "red_flags": [],
        }
        resp = StudyAnalysisResponse(**data)
        assert resp.safety_impact == 2

    def test_invalid_impact_range(self):
        data = {
            "primary_ingredient": "spinach",
            "summary": "Test",
            "safety_impact": 10,  # out of range
            "health_impact": 0,
            "confidence": "high",
        }
        with pytest.raises(ValidationError):
            StudyAnalysisResponse(**data)


class TestSafetyAdjustmentResponse:
    def test_valid(self):
        data = {
            "new_safety_score": 78,
            "new_health_index": 82,
            "reasoning": "New evidence supports lower risk.",
            "pmid_cited": "12345678",
        }
        resp = SafetyAdjustmentResponse(**data)
        assert resp.new_safety_score == 78

    def test_score_out_of_range(self):
        data = {
            "new_safety_score": 150,
            "new_health_index": 82,
            "reasoning": "Too high",
            "pmid_cited": "12345678",
        }
        with pytest.raises(ValidationError):
            SafetyAdjustmentResponse(**data)


class TestGuideGenerationResponse:
    def test_valid(self):
        data = {
            "markdown_content": "# Agent Guide: Spinach\n\n## Classification\n- Primary category: Leafy Vegetable\n- Known harmful molecules: oxalic acid\n\n## Safety Scoring Rules\n- Baseline safety score: 75\n- Critical modifiers: If study mentions kidney stone risk, reduce by 5\n",
            "version": 1,
        }
        resp = GuideGenerationResponse(**data)
        assert "Spinach" in resp.markdown_content

    def test_too_short(self):
        data = {
            "markdown_content": "Hi",
            "version": 1,
        }
        with pytest.raises(ValidationError):
            GuideGenerationResponse(**data)


class TestConflictArbitrationResponse:
    def test_valid(self):
        data = {
            "resolved_value": "12.5 mg",
            "confidence": "medium",
            "explanation": "USDA is more reliable here.",
        }
        resp = ConflictArbitrationResponse(**data)
        assert resp.resolved_value == "12.5 mg"


class TestMoleculeClassificationResponse:
    def test_valid(self):
        data = {
            "harm_level": 3,
            "harm_mechanisms": ["kidney stone risk"],
            "is_heat_stable": True,
            "is_neutralizable": True,
            "reasoning": "Oxalates are reduced by boiling.",
            "confidence": "high",
        }
        resp = MoleculeClassificationResponse(**data)
        assert resp.is_neutralizable is True
