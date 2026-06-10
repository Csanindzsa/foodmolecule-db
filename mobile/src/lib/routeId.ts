export const MAX_ROUTE_ID_CHARS = 128;

export function validRouteId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (cleaned.length === 0) return null;
  if (cleaned.toLowerCase() === "undefined" || cleaned.toLowerCase() === "null") return null;
  if (Array.from(value).length > MAX_ROUTE_ID_CHARS) return null;
  return value;
}
