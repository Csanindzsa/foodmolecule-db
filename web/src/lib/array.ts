export function asArray<T>(value: readonly T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

export function stringItems(value: unknown, limit = Number.POSITIVE_INFINITY): string[] {
  if (!Array.isArray(value)) return [];
  const maxItems = Math.max(0, limit);
  if (maxItems === 0) return [];
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text) continue;
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}
