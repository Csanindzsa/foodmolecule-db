import { describe, expect, test } from "bun:test";

import { formatLethalDose } from "./banListDisplay";

describe("ban list display helpers", () => {
  test("formatLethalDose normalizes finite numeric values", () => {
    expect(formatLethalDose("500.0000")).toBe("500 mg");
    expect(formatLethalDose("2.5000")).toBe("2.5 mg");
    expect(formatLethalDose(12)).toBe("12 mg");
  });

  test("formatLethalDose hides missing and malformed values", () => {
    expect(formatLethalDose(null)).toBe("No dose listed");
    expect(formatLethalDose("")).toBe("No dose listed");
    expect(formatLethalDose("unknown")).toBe("No dose listed");
    expect(formatLethalDose(Number.NaN, "Unavailable")).toBe("Unavailable");
  });
});
