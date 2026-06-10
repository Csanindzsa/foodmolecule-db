export function lethalDoseSortValue(value: unknown): number {
  if (value == null) return -1;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

export function formatLethalDose(value: unknown): string | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : null;
}
