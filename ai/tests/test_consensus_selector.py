"""
Tests for the Consensus Model Selector.
"""

import pytest

from ai.consensus_selector import ConsensusSelector, EXCLUDED_MODELS


class TestConsensusSelector:
    def test_strength_score_top_tier(self):
        selector = ConsensusSelector()
        model = {"id": "openai/gpt-4o", "context_length": 128000}
        score = selector._strength_score(model)
        assert score >= 0.95

    def test_strength_score_low_tier(self):
        selector = ConsensusSelector()
        model = {"id": "meta/llama-3.1-8b", "context_length": 8192}
        score = selector._strength_score(model)
        assert score < 0.6

    def test_excluded_models_return_negative(self):
        selector = ConsensusSelector()
        for mid in EXCLUDED_MODELS:
            model = {"id": mid, "context_length": 4096}
            score = selector.score_model(model, "study_analysis")
            assert score < 0

    def test_list_top_models_format(self):
        selector = ConsensusSelector()
        # This will hit the network; skip if no API key in CI
        if not selector.api_key:
            pytest.skip("No OPENROUTER_API_KEY set")

        top = selector.list_top_models("study_analysis", n=3)
        assert len(top) <= 3
        assert all("id" in m and "score" in m for m in top)
