import { describe, expect, test } from "bun:test";

import { normalizeHistory } from "./history";

describe("history storage helpers", () => {
  test("normalizeHistory rejects missing, invalid, and non-array payloads", () => {
    expect(normalizeHistory(null)).toEqual([]);
    expect(normalizeHistory("not json")).toEqual([]);
    expect(normalizeHistory(JSON.stringify({ id: "food-1" }))).toEqual([]);
  });

  test("normalizeHistory keeps valid items and drops malformed entries", () => {
    const result = normalizeHistory(JSON.stringify([
      { id: "food-1", name: "Apple", scannedAt: "2026-06-10T10:00:00Z", image_url: "https://example.com/apple.webp", health_index: 91.2 },
      { id: "missing-name", scannedAt: "2026-06-10T10:00:00Z" },
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
});
