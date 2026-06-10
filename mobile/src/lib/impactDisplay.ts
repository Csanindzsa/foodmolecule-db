export function normalizeImpact(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(-5, Math.min(5, Math.round(value)));
}

export function formatImpact(value: number | null | undefined): string | null {
  const normalized = normalizeImpact(value);
  if (normalized == null) return null;
  return normalized > 0 ? `+${normalized}` : String(normalized);
}
