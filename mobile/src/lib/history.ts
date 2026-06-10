import { normalizeScore } from "./scoreDisplay";

export interface StoredHistoryItem {
  id: string;
  name: string;
  scannedAt: string;
  image_url?: string;
  health_index?: number | null;
}

export function normalizeHistory(raw: string | null): StoredHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredHistoryItem =>
        typeof item?.id === "string" &&
        typeof item?.name === "string" &&
        typeof item?.scannedAt === "string",
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        scannedAt: item.scannedAt,
        image_url: typeof item.image_url === "string" ? item.image_url : undefined,
        health_index: normalizeScore(item.health_index),
      }))
      .slice(0, 50);
  } catch {
    return [];
  }
}
