export function ingredientTerms(value: unknown, limit = 16): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const term = item.trim();
    if (!term || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    terms.push(term);
    if (terms.length >= Math.max(0, limit)) break;
  }
  return terms;
}

export function formatHazardLevel(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.min(5, Math.round(value))));
}

export function rawOcrPreview(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const preview = value.trim();
  return preview ? preview : null;
}
