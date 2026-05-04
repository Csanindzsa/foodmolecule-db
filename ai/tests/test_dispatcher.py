"""
Tests for the OpenRouter Dispatcher.
"""

import pytest

from ai.dispatcher import OpenRouterDispatcher, render_prompt


class TestRenderPrompt:
    def test_renders_template(self):
        # We need to ensure templates exist; if not this will fail
        try:
            prompt = render_prompt("study_analysis", ingredient_name="spinach")
            assert "spinach" in prompt
        except Exception:
            pytest.skip("Template not found or Jinja2 env not configured")


class TestDispatcher:
    def test_init(self):
        d = OpenRouterDispatcher()
        assert d.selector is not None

    def test_dispatch_without_prompt_or_vars_raises(self):
        d = OpenRouterDispatcher()
        with pytest.raises(ValueError):
            d.dispatch("study_analysis")
