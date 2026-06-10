export function formatHarmLevel(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.min(5, Math.round(value))));
}

export function formatLinkedFoodCount(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.round(value)));
}

export function formatMolecularWeight(value: unknown): string | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : null;
}

export function formatPubChemCid(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cid = Math.trunc(value);
  return cid > 0 ? String(cid) : null;
}
