const HARM_HIGH_CLASS = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
const HARM_MODERATE_CLASS = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
const HARM_LOW_CLASS = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
const HARM_NEUTRAL_CLASS = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";

export function normalizeHarmLevel(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(5, Math.round(value)));
}

export function formatHarmLevel(value: unknown, fallback = "unknown"): string {
  const normalized = normalizeHarmLevel(value);
  return normalized === null ? fallback : String(normalized);
}

export function harmLevelLabel(value: unknown): string {
  const normalized = normalizeHarmLevel(value);
  if (normalized === null) return "Unknown";
  if (normalized >= 4) return "High";
  if (normalized >= 2) return "Moderate";
  return "Low";
}

export function harmLevelBadgeClass(value: unknown): string {
  const normalized = normalizeHarmLevel(value);
  if (normalized === null) return HARM_NEUTRAL_CLASS;
  if (normalized >= 4) return HARM_HIGH_CLASS;
  if (normalized >= 2) return HARM_MODERATE_CLASS;
  return HARM_LOW_CLASS;
}

export function foodMoleculeBadgeClass(value: unknown, isBeneficial?: boolean): string {
  const normalized = normalizeHarmLevel(value);
  if (normalized !== null && normalized >= 4) return HARM_HIGH_CLASS;
  if (normalized !== null && normalized >= 2) return HARM_MODERATE_CLASS;
  if (isBeneficial) return HARM_LOW_CLASS;
  return HARM_NEUTRAL_CLASS;
}

export function foodMoleculeBadgeLabel(value: unknown, isBeneficial?: boolean): string {
  const normalized = normalizeHarmLevel(value);
  if (normalized !== null && normalized >= 2) return `Harm ${normalized}`;
  return isBeneficial ? "Beneficial" : "Neutral";
}
