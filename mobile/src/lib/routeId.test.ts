import { describe, expect, test } from "bun:test";
import { MAX_ROUTE_ID_CHARS, validRouteId } from "./routeId";

describe("validRouteId", () => {
  test("accepts non-empty route IDs within the launch bound", () => {
    expect(validRouteId("food-1")).toBe("food-1");
    expect(validRouteId("x".repeat(MAX_ROUTE_ID_CHARS))).toBe("x".repeat(MAX_ROUTE_ID_CHARS));
  });

  test("rejects missing, blank, and oversized route IDs", () => {
    expect(validRouteId(undefined)).toBeNull();
    expect(validRouteId(null)).toBeNull();
    expect(validRouteId("   ")).toBeNull();
    expect(validRouteId("undefined")).toBeNull();
    expect(validRouteId(" null ")).toBeNull();
    expect(validRouteId("🎉".repeat(MAX_ROUTE_ID_CHARS + 1))).toBeNull();
  });
});
