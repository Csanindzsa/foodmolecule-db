import { normalizeScore } from "./scoreDisplay";
import { validRouteId } from "./routeId";

export interface StoredHistoryItem {
  id: string;
  name: string;
  scannedAt: string;
  image_url?: string;
  health_index?: number | null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function cleanScannedAt(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned || Number.isNaN(Date.parse(cleaned))) return null;
  return cleaned;
}

export function normalizeHistoryItem(value: unknown): StoredHistoryItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = validRouteId(cleanString(item.id));
  const name = cleanString(item.name);
  const scannedAt = cleanScannedAt(item.scannedAt);
  if (!id || !name || !scannedAt) return null;
  const imageUrl = cleanString(item.image_url);
  const healthIndex = typeof item.health_index === "number" || item.health_index == null
    ? normalizeScore(item.health_index)
    : null;

  return {
    id,
    name,
    scannedAt,
    image_url: imageUrl ?? undefined,
    health_index: healthIndex,
  };
}

export function normalizeHistory(raw: string | null): StoredHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeHistoryItem)
      .filter((item): item is StoredHistoryItem => item !== null)
      .slice(0, 50);
  } catch {
    return [];
  }
}
