export function asArray<T>(value: readonly T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

export function firstItems<T>(value: readonly T[] | null | undefined, count: number): T[] {
  return asArray(value).slice(0, Math.max(0, count));
}
