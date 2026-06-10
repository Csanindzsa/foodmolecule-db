const HEALTH_LABELS = ["Excellent", "Good", "Fair", "Caution", "Poor", "Avoid"] as const;
const HEALTH_LABEL_LOOKUP = new Map(HEALTH_LABELS.map((label) => [label.toLowerCase(), label]));

export function normalizeScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function formatScore(value: number | null | undefined, fallback = "unknown"): string {
  const score = normalizeScore(value);
  return score === null ? fallback : String(score);
}

export function scoreBadgeClass(value: number): string {
  if (value >= 75) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (value >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

export function formatHealthLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase();
  return HEALTH_LABEL_LOOKUP.get(label) ?? null;
}
