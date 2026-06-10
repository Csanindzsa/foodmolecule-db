import { describe, expect, test } from "bun:test";

import { formatDateTime } from "./dateDisplay";

describe("date display helpers", () => {
  test("formatDateTime returns locale date-time text for valid dates", () => {
    expect(formatDateTime("2026-06-10T10:00:00Z")).not.toBeNull();
  });

  test("formatDateTime rejects malformed values", () => {
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime(undefined)).toBeNull();
    expect(formatDateTime("not a date")).toBeNull();
    expect(formatDateTime(Number.NaN)).toBeNull();
  });
});
