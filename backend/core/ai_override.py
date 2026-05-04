"""
nutrii — AI Override Validator

Validates AI-proposed safety score overrides against the base algorithm.
An override is accepted ONLY if all guardrails pass.
"""

from __future__ import annotations

from dataclasses import dataclass

from core.models import Food, Study
from core.health_index import compute_health_index


MAX_DELTA = 15


@dataclass
class OverrideResult:
    accepted: bool
    reason: str
    proposed_score: int
    clamped_score: int | None = None


def validate_override(
    food: Food,
    proposed_safety_score: int,
    proposed_health_index: int,
    triggering_study: Study | None,
    reasoning: str,
) -> OverrideResult:
    """
    Validate an AI-proposed score adjustment.

    Rules:
    1. Must cite a specific PMID in reasoning.
    2. Triggering study must be a human RCT (heuristic: check abstract for 'randomized').
    3. Delta cannot exceed ±15 points.
    4. New score must be within 0–100.
    """
    base = compute_health_index(food)
    old_safety = food.overall_safety_score or base.safety_score
    old_health = food.health_index or base.score

    # Guard 1: PMID citation
    has_pmid = False
    if reasoning:
        import re
        has_pmid = bool(re.search(r"PMID\s*:\s*\d+|pmid\s*\d+|\b\d{7,8}\b", reasoning))
    if not has_pmid:
        return OverrideResult(
            accepted=False,
            reason="Missing PMID citation in reasoning.",
            proposed_score=proposed_safety_score,
        )

    # Guard 2: Delta cap
    if abs(proposed_safety_score - old_safety) > MAX_DELTA:
        clamped = old_safety + (MAX_DELTA if proposed_safety_score > old_safety else -MAX_DELTA)
        return OverrideResult(
            accepted=False,
            reason=f"Safety delta exceeds ±{MAX_DELTA}. Clamped to {clamped}.",
            proposed_score=proposed_safety_score,
            clamped_score=clamped,
        )

    if abs(proposed_health_index - old_health) > MAX_DELTA:
        clamped = old_health + (MAX_DELTA if proposed_health_index > old_health else -MAX_DELTA)
        return OverrideResult(
            accepted=False,
            reason=f"Health index delta exceeds ±{MAX_DELTA}. Clamped to {clamped}.",
            proposed_score=proposed_health_index,
            clamped_score=clamped,
        )

    # Guard 3: Range check
    if not (0 <= proposed_safety_score <= 100) or not (0 <= proposed_health_index <= 100):
        return OverrideResult(
            accepted=False,
            reason="Proposed score out of 0–100 range.",
            proposed_score=proposed_safety_score,
        )

    # Guard 4: Heuristic RCT check (if triggering study provided)
    if triggering_study and triggering_study.abstract:
        abstract_lower = triggering_study.abstract.lower()
        is_rct = any(kw in abstract_lower for kw in ("randomized", "controlled trial", "clinical trial"))
        if not is_rct:
            return OverrideResult(
                accepted=False,
                reason="Triggering study does not appear to be a human RCT. Override requires strong human evidence.",
                proposed_score=proposed_safety_score,
            )

    return OverrideResult(
        accepted=True,
        reason="All guardrails passed.",
        proposed_score=proposed_safety_score,
    )
