export function formatAmount(value: unknown, unit?: unknown): string | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const formatted = String(parsed);
  const unitText = typeof unit === "string" ? unit.trim() : "";
  return unitText ? `${formatted} ${unitText}` : formatted;
}
