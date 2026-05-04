"""
nutrii — AI Dispatcher

Unified inference router for all AI tasks.
Routes prompts through the ConsensusSelector to the best OpenRouter model,
enforces structured JSON output, and validates against Pydantic schemas.
"""

from __future__ import annotations

import json
from typing import Literal

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape

from scripts.pipeline.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

from .consensus_selector import ConsensusSelector, TaskType
from .parsers import (
    ConflictArbitrationResponse,
    GuideGenerationResponse,
    MoleculeClassificationResponse,
    SafetyAdjustmentResponse,
    StudyAnalysisResponse,
)

PARSER_MAP = {
    "study_analysis": StudyAnalysisResponse,
    "safety_adjustment": SafetyAdjustmentResponse,
    "guide_generation": GuideGenerationResponse,
    "conflict_arbitration": ConflictArbitrationResponse,
    "molecule_classification": MoleculeClassificationResponse,
}

# Jinja2 prompt loader
_jinja_env = Environment(
    loader=FileSystemLoader("ai/prompts"),
    autoescape=select_autoescape(),
)


def render_prompt(task_type: str, **kwargs) -> str:
    """Render a Jinja2 prompt template."""
    template = _jinja_env.get_template(f"{task_type}.j2")
    return template.render(**kwargs)


class OpenRouterDispatcher:
    """Central dispatcher for all OpenRouter AI inference."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = base_url or OPENROUTER_BASE_URL
        self.selector = ConsensusSelector(api_key=self.api_key, base_url=self.base_url)

    def _call(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 4000,
    ) -> dict:
        """Make a chat completion request to OpenRouter."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nutrii.app",
            "X-Title": "nutrii",
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()

        return data["choices"][0]["message"]["content"]

    def dispatch(
        self,
        task_type: TaskType,
        prompt: str | None = None,
        template_vars: dict | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
        fallback_models: list[str] | None = None,
    ):
        """Dispatch a task to the best available model and parse the response."""
        if prompt is None and template_vars is not None:
            prompt = render_prompt(task_type, **template_vars)
        elif prompt is None:
            raise ValueError("Either prompt or template_vars must be provided")

        parser_cls = PARSER_MAP[task_type]
        models_to_try = [self.selector.pick_best_model(task_type)]
        if fallback_models:
            models_to_try.extend(fallback_models)

        last_error = None
        for model in models_to_try:
            try:
                raw = self._call(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant. Always respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                data = json.loads(raw)
                return parser_cls(**data)
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(
            f"All models failed for task '{task_type}'. Last error: {last_error}"
        )

    def dispatch_raw(
        self,
        task_type: TaskType,
        prompt: str | None = None,
        template_vars: dict | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
    ) -> str:
        """Dispatch and return the raw JSON string without parsing."""
        if prompt is None and template_vars is not None:
            prompt = render_prompt(task_type, **template_vars)
        elif prompt is None:
            raise ValueError("Either prompt or template_vars must be provided")

        model = self.selector.pick_best_model(task_type)
        return self._call(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )


# Global singleton for convenience
dispatcher = OpenRouterDispatcher()
