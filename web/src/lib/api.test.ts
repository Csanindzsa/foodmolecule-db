import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { api } from "./api";

describe("api", () => {
  const mockFetch = mock((input: RequestInfo | URL) =>
    Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  );

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe("foods", () => {
    test("calls /foods/", async () => {
      await api.foods();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("/api/v1/foods/");
    });

    test("returns parsed JSON", async () => {
      const data = { results: [{ id: "1", name: "Apple" }] };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      const result = await api.foods();
      expect(result).toEqual(data);
    });
  });

  describe("food", () => {
    test("calls /foods/{id}/", async () => {
      await api.food("123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/123/");
    });
  });

  describe("foodHealthIndex", () => {
    test("calls /foods/{id}/health-index/", async () => {
      await api.foodHealthIndex("456");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/456/health-index/");
    });
  });

  describe("foodStudies", () => {
    test("calls /foods/{id}/studies/", async () => {
      await api.foodStudies("789");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/789/studies/");
    });
  });

  describe("recentStudies", () => {
    test("calls /studies/recent/", async () => {
      await api.recentStudies();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/studies/recent/");
    });
  });

  describe("search", () => {
    test("calls /foods/search/ with encoded query", async () => {
      await api.search("apple pie");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/search/?q=apple%20pie");
    });
  });

  describe("molecules", () => {
    test("calls /molecules/", async () => {
      await api.molecules();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/molecules/");
    });
  });

  describe("molecule", () => {
    test("calls /molecules/{id}/", async () => {
      await api.molecule("mol-1");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/molecules/mol-1/");
    });
  });

  describe("stats", () => {
    test("calls /stats/", async () => {
      await api.stats();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/stats/");
    });
  });

  describe("banList", () => {
    test("calls /ban-list/", async () => {
      await api.banList();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/ban-list/");
    });

    test("returns paginated results structure", async () => {
      const data = {
        results: [
          {
            id: "1",
            food: {
              id: "f1",
              name: "Test Food",
              category: "Test Cat",
              health_index: 5,
            },
            reason: "Too dangerous",
            lethal_dose_mg: "100.0000",
            is_conditionally_safe: false,
            safe_condition: "None",
            regulatory_status: {},
          },
        ],
      };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      const result = await api.banList();
      expect(result).toEqual(data);
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(1);
    });
  });

  describe("compare", () => {
    test("throws when ids array is empty", () => {
      expect(() => api.compare([])).toThrow("compare requires at least one food ID");
    });

    test("does not throw when ids array is non-empty", () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ foods: [], shared_molecules: [], total_unique_molecules: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      expect(() => api.compare(["1"])).not.toThrow();
    });

    test("calls /foods/compare/ with comma-separated ids", async () => {
      const data = {
        foods: [
          { id: "1", name: "Apple", health_index: 8, safety_score: 9, molecules: {} },
          { id: "2", name: "Banana", health_index: 7, safety_score: 8, molecules: {} },
        ],
        shared_molecules: [],
        total_unique_molecules: 0,
      };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      await api.compare(["1", "2", "3"]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/compare/?ids=1,2,3");
    });

    test("returns typed response with correct shape", async () => {
      const data = {
        foods: [
          { id: "1", name: "Apple", health_index: 8, safety_score: 9, molecules: { "Water": 95.5 } },
        ],
        shared_molecules: ["Water"],
        total_unique_molecules: 1,
      };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      const result = await api.compare(["1"]);
      expect(result).toEqual(data);
      expect(result.foods[0].molecules).toEqual({ "Water": 95.5 });
      expect(result.shared_molecules).toEqual(["Water"]);
      expect(result.total_unique_molecules).toBe(1);
    });
  });

  describe("guide", () => {
    test("calls /foods/{id}/guide/", async () => {
      const data = {
        food_id: "food-1",
        guide: "Cook thoroughly.",
        version: 1,
        generated_by: "ai",
        generated_at: "2024-01-01T00:00:00Z",
      };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      await api.guide("food-1");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/foods/food-1/guide/");
    });

    test("returns typed response with correct shape", async () => {
      const data = {
        food_id: "food-2",
        guide: null,
        version: 0,
        generated_by: "system",
        generated_at: "2024-06-15T12:00:00Z",
      };
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      const result = await api.guide("food-2");
      expect(result).toEqual(data);
      expect(result.food_id).toBe("food-2");
      expect(result.guide).toBeNull();
      expect(result.version).toBe(0);
      expect(result.generated_by).toBe("system");
      expect(result.generated_at).toBe("2024-06-15T12:00:00Z");
    });
  });

  describe("error handling", () => {
    test("throws on non-ok response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
          })
        )
      );
      await expect(api.foods()).rejects.toThrow("API error: 404 Not Found");
    });

    test("throws server detail text for non-ok JSON responses", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: "Search query is too long." }), {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      await expect(api.search("x")).rejects.toThrow("Search query is too long.");
    });

    test("throws on 500 response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response("Server Error", {
            status: 500,
            statusText: "Internal Server Error",
          })
        )
      );
      await expect(api.stats()).rejects.toThrow("API error: 500 Internal Server Error");
    });
  });

  describe("adversarial security", () => {
    test("search encodes XSS payload in query string", async () => {
      const xss = "<script>alert(1)</script>";
      await api.search(xss);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/search/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
      expect(url).not.toContain("<script>");
    });

    test("search encodes SQL injection attempt", async () => {
      const sql = "' OR '1'='1'; DROP TABLE users; --";
      await api.search(sql);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/search/?q='%20OR%20'1'%3D'1'%3B%20DROP%20TABLE%20users%3B%20--");
      // The semicolon is encoded, breaking the SQL statement structure
      expect(url).not.toContain("; DROP");
      expect(url).toContain("%3B");
    });

    test("search handles unicode and special characters", async () => {
      const unicode = "日本語🔥\x00\n\t";
      await api.search(unicode);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("%E6%97%A5%E6%9C%AC%E8%AA%9E");
      expect(url).not.toContain("\x00");
    });

    test("search rejects very long query strings before fetch", async () => {
      const longQuery = "a".repeat(10000);
      expect(() => api.search(longQuery)).toThrow("Search queries are limited to 128 characters.");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test("search counts unicode queries by code point before fetch", async () => {
      const longQuery = "🎉".repeat(129);
      expect(() => api.search(longQuery)).toThrow("Search queries are limited to 128 characters.");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test("food encodes path traversal in ID", async () => {
      const malicious = "../../etc/passwd";
      await api.food(malicious);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/..%2F..%2Fetc%2Fpasswd/");
    });

    test("molecule encodes path traversal in ID", async () => {
      const malicious = "../../../admin";
      await api.molecule(malicious);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/molecules/..%2F..%2F..%2Fadmin/");
    });

    test("guide encodes path traversal in ID", async () => {
      const malicious = "..%2f..%2fsecret";
      await api.guide(malicious);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/..%252f..%252fsecret/guide/");
    });

    test("foodHealthIndex encodes path traversal in ID", async () => {
      const malicious = "../../api/v1/stats/";
      await api.foodHealthIndex(malicious);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/..%2F..%2Fapi%2Fv1%2Fstats%2F/health-index/");
    });

    test("foodStudies encodes path traversal in ID", async () => {
      const malicious = "../../api/v1/ban-list/";
      await api.foodStudies(malicious);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/..%2F..%2Fapi%2Fv1%2Fban-list%2F/studies/");
    });

    test("food handles empty string ID", async () => {
      await api.food("");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods//");
    });

    test("molecule handles empty string ID", async () => {
      await api.molecule("");
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/molecules//");
    });

    test("food handles very long ID", async () => {
      const longId = "x".repeat(5000);
      await api.food(longId);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe(`/api/v1/foods/${longId}/`);
      expect(url.length).toBeGreaterThan(5000);
    });

    test("compare handles many IDs creating very long URL", async () => {
      const ids = Array.from({ length: 500 }, (_, i) => `id-${i}`);
      await api.compare(ids);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url.startsWith("/api/v1/foods/compare/?ids=")).toBe(true);
      expect(url.length).toBeGreaterThan(2000);
    });

    test("compare handles path traversal in individual IDs", async () => {
      await api.compare(["../../admin", "normal-id", "../../../etc/passwd"]);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/compare/?ids=..%2F..%2Fadmin,normal-id,..%2F..%2F..%2Fetc%2Fpasswd");
    });

    test("compare handles empty string IDs in array", async () => {
      await api.compare(["", "valid", ""]);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/compare/?ids=,valid,");
    });

    test("compare handles IDs with special characters", async () => {
      await api.compare(["id&foo=bar", "id?baz=qux", "id#frag"]);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/foods/compare/?ids=id%26foo%3Dbar,id%3Fbaz%3Dqux,id%23frag");
    });

    test("banList is not injectable via current signature", async () => {
      // Current api.banList() takes no arguments, so query injection is not possible
      // through the function signature itself. This test documents that boundary.
      await api.banList();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/ban-list/");
      expect(url).not.toContain("conditional");
      expect(url).not.toContain("?");
    });

    test("stats is not injectable via current signature", async () => {
      await api.stats();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("/api/v1/stats/");
      expect(url).not.toContain("?");
    });

    test("search handles null byte injection attempt", async () => {
      const payload = "test\x00malicious";
      await api.search(payload);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("\x00");
    });

    test("search handles RTL override unicode", async () => {
      const rtl = "\u202Eevil\u202C";
      await api.search(rtl);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("%E2%80%AE");
      expect(url).not.toContain("\u202E");
    });
  });
});
