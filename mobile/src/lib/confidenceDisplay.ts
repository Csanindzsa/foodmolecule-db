const CONFIDENCE_LABELS = new Set(["high", "medium", "low"]);

export function normalizeConfidence(value: unknown): "high" | "medium" | "low" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return CONFIDENCE_LABELS.has(normalized) ? (normalized as "high" | "medium" | "low") : null;
}

export function formatConfidence(value: unknown): string | null {
  const normalized = normalizeConfidence(value);
  return normalized ? `AI confidence: ${normalized}` : null;
}
