export function formatLethalDose(value: unknown, fallback = "No dose listed"): string {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed} mg` : fallback;
}
