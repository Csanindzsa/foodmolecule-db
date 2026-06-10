export function normalizeScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function formatScore(value: number | null | undefined, fallback = "unknown"): string {
  const score = normalizeScore(value);
  return score === null ? fallback : String(score);
}

export function formatPercent(value: number | null | undefined, fallback = "unknown"): string {
  const score = normalizeScore(value);
  return score === null ? fallback : `${score}%`;
}
