import { describe, expect, test } from "bun:test";
import { formatConfidence, normalizeConfidence } from "./confidenceDisplay";

describe("confidence display helpers", () => {
  test("normalizeConfidence accepts supported labels case-insensitively", () => {
    expect(normalizeConfidence("high")).toBe("high");
    expect(normalizeConfidence(" Medium ")).toBe("medium");
    expect(normalizeConfidence("LOW")).toBe("low");
  });

  test("normalizeConfidence rejects malformed labels", () => {
    expect(normalizeConfidence(null)).toBeNull();
    expect(normalizeConfidence(undefined)).toBeNull();
    expect(normalizeConfidence("")).toBeNull();
    expect(normalizeConfidence("certain")).toBeNull();
    expect(normalizeConfidence("<script>alert(1)</script>")).toBeNull();
  });

  test("formatConfidence returns UI copy only for valid labels", () => {
    expect(formatConfidence("high")).toBe("AI confidence: high");
    expect(formatConfidence("unknown")).toBeNull();
  });
});
