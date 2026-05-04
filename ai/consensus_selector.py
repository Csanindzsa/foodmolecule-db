"""
nutrii — Consensus Model Selector

Queries OpenRouter for available models and scores them by:
    score = (context_length * 0.2) + (strength_score * 0.5) + (availability_score * 0.3)

The top-scoring model is selected for each task.
"""

from __future__ import annotations

import time
from typing import Literal

import httpx
from pydantic import BaseModel

from scripts.pipeline.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

TaskType = Literal[
    "study_analysis",
    "safety_adjustment",
    "guide_generation",
    "conflict_arbitration",
    "molecule_classification",
]

# Task-specific model preferences (model ID substring → bonus)
TASK_PREFERENCES: dict[TaskType, dict[str, float]] = {
    "study_analysis": {
        "claude": 0.1,
        "gpt-4": 0.15,
        "o3": 0.2,
    },
    "safety_adjustment": {
        "claude": 0.15,
        "gpt-4": 0.1,
    },
    "guide_generation": {
        "claude": 0.1,
        "gemini": 0.05,
    },
    "conflict_arbitration": {
        "o3": 0.2,
        "claude": 0.1,
    },
    "molecule_classification": {
        "gpt-4": 0.1,
        "gemini": 0.05,
    },
}

# Hard-exclude models known to be unreliable for scientific reasoning
EXCLUDED_MODELS = {
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
}


class ModelInfo(BaseModel):
    id: str
    name: str
    context_length: int
    pricing: dict
    # OpenRouter may expose these; we fall back to heuristics if absent
    per_request_limits: dict | None = None


class ConsensusSelector:
    """Selects the best available OpenRouter model for a given task."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = base_url or OPENROUTER_BASE_URL
        self._cache: dict | None = None
        self._cache_time: float = 0
        self._cache_ttl = 300  # 5 minutes

    def _fetch_models(self) -> list[dict]:
        """Fetch the model list from OpenRouter."""
        if self._cache and (time.time() - self._cache_time) < self._cache_ttl:
            return self._cache

        url = f"{self.base_url}/models"
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        with httpx.Client() as client:
            resp = client.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()

        models = data.get("data", [])
        self._cache = models
        self._cache_time = time.time()
        return models

    @staticmethod
    def _strength_score(model: dict) -> float:
        """Heuristic strength score (0–1) based on model ID and context length."""
        model_id = model.get("id", "").lower()
        context = model.get("context_length", 0)

        # Top-tier models
        if any(m in model_id for m in ("gpt-4o", "claude-3.5-sonnet", "claude-3-opus", "o1", "o3")):
            base = 1.0
        elif any(m in model_id for m in ("gpt-4", "claude-3", "gemini-1.5-pro")):
            base = 0.85
        elif any(m in model_id for m in ("gemini-1.5-flash", "llama-3.1-70b", "mixtral-8x22b")):
            base = 0.7
        elif any(m in model_id for m in ("llama-3.1-8b", "gemma-2")):
            base = 0.5
        else:
            base = 0.4

        # Bonus for very large context windows (long abstracts)
        if context >= 200_000:
            base += 0.05

        return min(base, 1.0)

    @staticmethod
    def _availability_score(model: dict) -> float:
        """Heuristic availability score (0–1)."""
        # If OpenRouter exposes latency/error stats, use them.
        # Otherwise assume high availability for mainstream models.
        model_id = model.get("id", "").lower()
        mainstream = any(m in model_id for m in ("gpt-4", "claude-3", "gemini"))
        return 0.95 if mainstream else 0.75

    def score_model(self, model: dict, task_type: TaskType) -> float:
        """Compute the composite score for a model on a specific task."""
        model_id = model.get("id", "")

        if model_id in EXCLUDED_MODELS:
            return -1.0

        context = model.get("context_length", 0)
        strength = self._strength_score(model)
        availability = self._availability_score(model)

        score = (context / 1_000_000 * 0.2) + (strength * 0.5) + (availability * 0.3)

        # Apply task-specific preference bonuses
        for substr, bonus in TASK_PREFERENCES.get(task_type, {}).items():
            if substr in model_id.lower():
                score += bonus

        return score

    def pick_best_model(self, task_type: TaskType) -> str:
        """Return the model ID with the highest composite score."""
        models = self._fetch_models()
        if not models:
            raise RuntimeError("No models available from OpenRouter")

        scored = [(m, self.score_model(m, task_type)) for m in models]
        scored.sort(key=lambda x: x[1], reverse=True)

        best = scored[0]
        if best[1] < 0:
            raise RuntimeError("All models excluded or unavailable")

        return best[0]["id"]

    def list_top_models(self, task_type: TaskType, n: int = 5) -> list[dict]:
        """Return the top N models with scores (for debugging)."""
        models = self._fetch_models()
        scored = [(m, self.score_model(m, task_type)) for m in models]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [
            {
                "id": m["id"],
                "score": round(score, 3),
                "context_length": m.get("context_length"),
            }
            for m, score in scored[:n]
        ]


if __name__ == "__main__":
    selector = ConsensusSelector()
    print("Top models for study_analysis:")
    for info in selector.list_top_models("study_analysis", n=5):
        print(f"  {info['id']}: {info['score']} (ctx={info['context_length']})")
