import { describe, expect, test } from "bun:test";

import { formatPublicationYear } from "./yearDisplay";

describe("year display helpers", () => {
  test("formatPublicationYear keeps plausible finite years", () => {
    expect(formatPublicationYear(2026)).toBe("2026");
    expect(formatPublicationYear(2026.9)).toBe("2026");
  });

  test("formatPublicationYear rejects malformed and implausible years", () => {
    expect(formatPublicationYear(Number.NaN)).toBeNull();
    expect(formatPublicationYear("2026")).toBeNull();
    expect(formatPublicationYear(1799)).toBeNull();
    expect(formatPublicationYear(2101)).toBeNull();
  });
});
