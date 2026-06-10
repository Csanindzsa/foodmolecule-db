import { describe, expect, test } from "bun:test";

import { formatDate } from "./dateDisplay";

describe("date display helpers", () => {
  test("formatDate returns locale date text for valid dates", () => {
    expect(formatDate("2024-01-01T00:00:00Z")).not.toBeNull();
  });

  test("formatDate rejects malformed values", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate("not a date")).toBeNull();
    expect(formatDate(0)).toBeNull();
    expect(formatDate(new Date("2024-01-01T00:00:00Z"))).toBeNull();
    expect(formatDate(Number.NaN)).toBeNull();
  });
});
