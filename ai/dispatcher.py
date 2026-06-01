"""
nutrii — AI Dispatcher

Unified inference router for all AI tasks.
Routes prompts through configured OpenAI-compatible providers, enforces
structured JSON output, and validates against Pydantic schemas.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape

from scripts.pipeline.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_API_KEYS,
    OPENROUTER_BASE_URL,
    OPENCODE_GO_API_KEYS,
    OPENCODE_GO_BASE_URL,
    OPENCODE_GO_MODEL,
)

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


@dataclass(frozen=True)
class ProviderCredential:
    """A single API credential + endpoint to try for AI inference."""

    provider: str
    api_key: str
    base_url: str
    default_model: str | None = None
    supports_model_listing: bool = True


def render_prompt(task_type: str, **kwargs) -> str:
    """Render a Jinja2 prompt template."""
    template = _jinja_env.get_template(f"{task_type}.j2")
    return template.render(**kwargs)


class OpenRouterDispatcher:
    """Central dispatcher for AI inference with provider/key fallback.

    The historical OpenRouter path remains first. If OpenRouter is exhausted or
    fails, additional credentials are tried in order, including OpenCode Go keys
    configured through OPENCODE_GO_API_KEY or OPENCODE_GO_API_KEYS.
    """

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = base_url or OPENROUTER_BASE_URL
        self.credentials = self._build_credentials(api_key=api_key, base_url=base_url)
        self.selector = ConsensusSelector(api_key=self.api_key, base_url=self.base_url)
        self.last_model_used: str | None = None
        self.last_provider_used: str | None = None

    def _build_credentials(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> list[ProviderCredential]:
        """Return credentials in failover order without logging secrets."""
        credentials: list[ProviderCredential] = []

        if api_key:
            credentials.append(
                ProviderCredential(
                    provider="openrouter",
                    api_key=api_key,
                    base_url=base_url or OPENROUTER_BASE_URL,
                    supports_model_listing=True,
                )
            )
        else:
            for key in OPENROUTER_API_KEYS:
                credentials.append(
                    ProviderCredential(
                        provider="openrouter",
                        api_key=key,
                        base_url=OPENROUTER_BASE_URL,
                        supports_model_listing=True,
                    )
                )

        for key in OPENCODE_GO_API_KEYS:
            credentials.append(
                ProviderCredential(
                    provider="opencode-go",
                    api_key=key,
                    base_url=OPENCODE_GO_BASE_URL,
                    default_model=OPENCODE_GO_MODEL,
                    supports_model_listing=False,
                )
            )

        return credentials

    def _call(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 4000,
        credential: ProviderCredential | None = None,
    ) -> str:
        """Make a chat completion request to an OpenAI-compatible provider."""
        credential = credential or ProviderCredential(
            provider="openrouter",
            api_key=self.api_key,
            base_url=self.base_url,
        )
        url = f"{credential.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {credential.api_key}",
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

        self.last_model_used = model
        self.last_provider_used = credential.provider
        return data["choices"][0]["message"]["content"]

    def _models_for_credential(
        self,
        credential: ProviderCredential,
        task_type: TaskType,
        fallback_models: list[str] | None = None,
    ) -> list[str]:
        """Return candidate model IDs for a provider credential."""
        models: list[str] = []
        if credential.default_model:
            models.append(credential.default_model)
        elif credential.supports_model_listing:
            selector = ConsensusSelector(api_key=credential.api_key, base_url=credential.base_url)
            models.append(selector.pick_best_model(task_type))

        for model in fallback_models or []:
            if model not in models:
                models.append(model)
        return models

    def dispatch(
        self,
        task_type: TaskType,
        prompt: str | None = None,
        template_vars: dict | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
        fallback_models: list[str] | None = None,
    ):
        """Dispatch a task to the best available credential/model and parse the response."""
        if prompt is None and template_vars is not None:
            prompt = render_prompt(task_type, **template_vars)
        elif prompt is None:
            raise ValueError("Either prompt or template_vars must be provided")

        parser_cls = PARSER_MAP[task_type]
        last_error = None

        if not self.credentials:
            raise RuntimeError(
                "No AI provider credentials configured. Set OPENROUTER_API_KEY, "
                "OPENROUTER_API_KEYS, OPENCODE_GO_API_KEY, or OPENCODE_GO_API_KEYS."
            )

        for credential in self.credentials:
            try:
                models_to_try = self._models_for_credential(credential, task_type, fallback_models)
            except Exception as exc:
                last_error = exc
                continue

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
                        credential=credential,
                    )
                    data = json.loads(raw)
                    return parser_cls(**data)
                except Exception as exc:
                    last_error = exc
                    continue

        raise RuntimeError(
            f"All AI provider credentials/models failed for task '{task_type}'. Last error: {last_error}"
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

        if not self.credentials:
            raise RuntimeError(
                "No AI provider credentials configured. Set OPENROUTER_API_KEY, "
                "OPENROUTER_API_KEYS, OPENCODE_GO_API_KEY, or OPENCODE_GO_API_KEYS."
            )

        last_error = None
        for credential in self.credentials:
            try:
                models_to_try = self._models_for_credential(credential, task_type)
            except Exception as exc:
                last_error = exc
                continue

            for model in models_to_try:
                try:
                    return self._call(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        max_tokens=max_tokens,
                        credential=credential,
                    )
                except Exception as exc:
                    last_error = exc
                    continue

        raise RuntimeError(
            f"All AI provider credentials/models failed for raw task '{task_type}'. Last error: {last_error}"
        )


# Global singleton for convenience
dispatcher = OpenRouterDispatcher()
