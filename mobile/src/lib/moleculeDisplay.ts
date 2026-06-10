export function formatHarmLevel(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.min(5, Math.round(value))));
}

export function formatLinkedFoodCount(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.round(value)));
}
