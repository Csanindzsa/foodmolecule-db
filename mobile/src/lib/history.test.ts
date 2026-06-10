import { describe, expect, test } from "bun:test";

import { normalizeHistory, normalizeHistoryItem } from "./history";

describe("history storage helpers", () => {
  test("normalizeHistory rejects missing, invalid, and non-array payloads", () => {
    expect(normalizeHistory(null)).toEqual([]);
    expect(normalizeHistory("not json")).toEqual([]);
    expect(normalizeHistory(JSON.stringify({ id: "food-1" }))).toEqual([]);
  });

  test("normalizeHistory keeps valid items and drops malformed entries", () => {
    const result = normalizeHistory(JSON.stringify([
      { id: " food-1 ", name: " Apple ", scannedAt: " 2026-06-10T10:00:00Z ", image_url: " https://example.com/apple.webp ", health_index: 91.2 },
      { id: "missing-name", scannedAt: "2026-06-10T10:00:00Z" },
      { id: "bad-date", name: "Bad Date", scannedAt: "not a date" },
      { id: "food-2", name: "Pear", scannedAt: "2026-06-10T11:00:00Z", image_url: 42, health_index: 200 },
    ]));

    expect(result).toEqual([
      {
        id: "food-1",
        name: "Apple",
        scannedAt: "2026-06-10T10:00:00Z",
        image_url: "https://example.com/apple.webp",
        health_index: 91,
      },
      {
        id: "food-2",
        name: "Pear",
        scannedAt: "2026-06-10T11:00:00Z",
        image_url: undefined,
        health_index: 100,
      },
    ]);
  });

  test("normalizeHistory caps restored history at 50 items", () => {
    const raw = JSON.stringify(Array.from({ length: 60 }, (_, index) => ({
      id: `food-${index}`,
      name: `Food ${index}`,
      scannedAt: "2026-06-10T10:00:00Z",
    })));

    expect(normalizeHistory(raw)).toHaveLength(50);
  });

  test("normalizeHistoryItem rejects malformed values and clamps health context", () => {
    expect(normalizeHistoryItem({ id: "", name: "Apple", scannedAt: "2026-06-10T10:00:00Z" })).toBeNull();
    expect(normalizeHistoryItem({ id: "undefined", name: "Apple", scannedAt: "2026-06-10T10:00:00Z" })).toBeNull();
    expect(normalizeHistoryItem({ id: "x".repeat(129), name: "Apple", scannedAt: "2026-06-10T10:00:00Z" })).toBeNull();
    expect(normalizeHistoryItem({ id: "food-1", name: "Apple", scannedAt: "not a date" })).toBeNull();
    expect(normalizeHistoryItem({
      id: " food-1 ",
      name: " Apple ",
      scannedAt: "2026-06-10T10:00:00Z",
      image_url: " https://example.com/apple.webp ",
      health_index: Number.POSITIVE_INFINITY,
    })).toEqual({
      id: "food-1",
      name: "Apple",
      scannedAt: "2026-06-10T10:00:00Z",
      image_url: "https://example.com/apple.webp",
      health_index: null,
    });
  });
});
