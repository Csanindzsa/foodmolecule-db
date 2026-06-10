export function moleculeAmountEntries(value: unknown): Array<[string, number]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, number] => {
      const [name, amount] = entry;
      return name.trim().length > 0 && typeof amount === "number" && Number.isFinite(amount);
    })
    .sort((a, b) => b[1] - a[1]);
}

export function formatCount(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return String(Math.max(0, Math.round(value)));
}

export function sharedMoleculeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}
