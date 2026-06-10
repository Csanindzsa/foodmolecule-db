export function formatAmount(value: unknown, unit?: unknown, fallback = "unknown"): string {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const formatted = String(parsed);
  const unitText = typeof unit === "string" ? unit.trim() : "";
  return unitText ? `${formatted} ${unitText}` : formatted;
}
