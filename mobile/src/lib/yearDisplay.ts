export function formatPublicationYear(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const year = Math.trunc(value);
  if (year < 1800 || year > 2100) return null;
  return String(year);
}
