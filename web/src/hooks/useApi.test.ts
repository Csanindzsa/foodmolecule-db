import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

/* ------------------------------------------------------------------
 *  Module-level mock setup — MUST come before importing the SUT
 * ---------------------------------------------------------------- */

const useQueryCalls: any[] = [];

const mockUseQuery = mock((config: any) => {
  useQueryCalls.push(config);
  return { data: undefined, isLoading: false, error: null };
});

mock.module("@tanstack/react-query", () => ({
  useQuery: mockUseQuery,
}));

const mockStats = mock(() => Promise.resolve({ total_foods: 100, total_molecules: 50 }));
const mockFoods = mock(() => Promise.resolve({ results: [{ id: "1", name: "Apple" }] }));
const mockSearch = mock(() => Promise.resolve({ foods: [{ id: "f1", name: "Banana" }], molecules: [{ id: "m1", name: "Water" }] }));
const mockFood = mock(() => Promise.resolve({
  id: "food-1",
  name: "Apple",
  molecules: [{ id: "mol-1", name: "Quercetin" }],
}));
const mockFoodStudies = mock(() => Promise.resolve({ results: [{ id: "study-1", title: "Health Benefits" }] }));
const mockGuide = mock(() => Promise.resolve({
  food_id: "food-1",
  guide: "Eat fresh.",
  version: 1,
  generated_by: "ai",
  generated_at: "2024-01-01T00:00:00Z",
}));
const mockMolecule = mock(() => Promise.resolve({
  id: "mol-1",
  name: "Caffeine",
  foods: [{ id: "food-2", name: "Coffee" }],
  neutralization_methods: [{ method: "Drink water" }],
}));
const mockBanList = mock(() => Promise.resolve({ results: [{ id: "bl-1", reason: "Unsafe" }] }));
const mockCompare = mock(() => Promise.resolve({
  foods: [{ id: "c1", name: "Apple" }],
  shared_molecules: ["Water"],
  total_unique_molecules: 1,
}));

mock.module("../lib/api", () => ({
  api: {
    stats: mockStats,
    foods: mockFoods,
    search: mockSearch,
    food: mockFood,
    foodStudies: mockFoodStudies,
    guide: mockGuide,
    molecule: mockMolecule,
    banList: mockBanList,
    compare: mockCompare,
  },
}));

/* ------------------------------------------------------------------
 *  Import hooks under test (AFTER mocks are registered)
 * ---------------------------------------------------------------- */

import {
  useHomeData,
  useSearch,
  useFoodDetail,
  useFoodMolecules,
  useFoodStudies,
  useFoodGuide,
  useMoleculeDetail,
  useMoleculeFoods,
  useMoleculeNeutralizations,
  useBanList,
  useCompare,
} from "./useApi";

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function lastUseQueryCall() {
  return useQueryCalls[useQueryCalls.length - 1];
}

function clearUseQueryCalls() {
  useQueryCalls.length = 0;
}

/* ------------------------------------------------------------------
 *  Tests
 * ---------------------------------------------------------------- */

describe("useApi hooks", () => {
  beforeEach(() => {
    clearUseQueryCalls();
    mockUseQuery.mockClear();
    mockStats.mockClear();
    mockFoods.mockClear();
    mockSearch.mockClear();
    mockFood.mockClear();
    mockFoodStudies.mockClear();
    mockGuide.mockClear();
    mockMolecule.mockClear();
    mockBanList.mockClear();
    mockCompare.mockClear();
  });

  afterEach(() => {
    mockUseQuery.mockClear();
  });

  /* ---------------------------------------------------------------- */
  describe("useHomeData", () => {
    test("happy path — passes correct queryKey and staleTime", () => {
      useHomeData();
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["home"]);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("queryFn calls api.stats and api.foods in parallel", async () => {
      useHomeData();
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockStats).toHaveBeenCalledTimes(1);
      expect(mockFoods).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        stats: { total_foods: 100, total_molecules: 50 },
        foods: [{ id: "1", name: "Apple" }],
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useSearch", () => {
    test("happy path — enabled when query is non-empty", () => {
      useSearch("apple");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["search", "apple"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(2 * 60 * 1000);
    });

    test("disabled when query is empty string", () => {
      useSearch("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
      expect(config.queryKey).toEqual(["search", ""]);
    });

    test("queryFn calls api.search with the query string", async () => {
      useSearch("banana");
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith("banana");
      expect(result).toEqual({
        foods: [{ id: "f1", name: "Banana" }],
        molecules: [{ id: "m1", name: "Water" }],
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useFoodDetail", () => {
    test("happy path — enabled when id is truthy", () => {
      useFoodDetail("food-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["food", "food-1"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useFoodDetail("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
      expect(config.queryKey).toEqual(["food", ""]);
    });

    test("queryFn calls api.food with the id", async () => {
      useFoodDetail("food-99");
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockFood).toHaveBeenCalledTimes(1);
      expect(mockFood).toHaveBeenCalledWith("food-99");
      expect(result).toEqual({
        id: "food-1",
        name: "Apple",
        molecules: [{ id: "mol-1", name: "Quercetin" }],
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useFoodMolecules", () => {
    test("happy path — enabled when id is truthy", () => {
      useFoodMolecules("food-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["food", "food-1"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useFoodMolecules("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.food with the id", async () => {
      useFoodMolecules("food-1");
      const config = lastUseQueryCall();
      await config.queryFn();
      expect(mockFood).toHaveBeenCalledTimes(1);
      expect(mockFood).toHaveBeenCalledWith("food-1");
    });

    test("select extracts molecules array", () => {
      useFoodMolecules("food-1");
      const config = lastUseQueryCall();
      const raw = {
        id: "food-1",
        name: "Apple",
        molecules: [{ id: "m1", name: "Quercetin" }, { id: "m2", name: "Fiber" }],
      };
      const selected = config.select(raw);
      expect(selected).toEqual([
        { id: "m1", name: "Quercetin" },
        { id: "m2", name: "Fiber" },
      ]);
    });

    test("select returns empty array when molecules is empty", () => {
      useFoodMolecules("food-1");
      const config = lastUseQueryCall();
      const raw = { id: "food-1", name: "Apple", molecules: [] };
      expect(config.select(raw)).toEqual([]);
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useFoodStudies", () => {
    test("happy path — enabled when id is truthy", () => {
      useFoodStudies("food-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["food", "food-1", "studies"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useFoodStudies("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.foodStudies with the id", async () => {
      useFoodStudies("food-1");
      const config = lastUseQueryCall();
      await config.queryFn();
      expect(mockFoodStudies).toHaveBeenCalledTimes(1);
      expect(mockFoodStudies).toHaveBeenCalledWith("food-1");
    });

    test("select unwraps data.results", () => {
      useFoodStudies("food-1");
      const config = lastUseQueryCall();
      const raw = { results: [{ id: "s1", title: "Study A" }, { id: "s2", title: "Study B" }] };
      expect(config.select(raw)).toEqual([
        { id: "s1", title: "Study A" },
        { id: "s2", title: "Study B" },
      ]);
    });

    test("select returns empty array when results is empty", () => {
      useFoodStudies("food-1");
      const config = lastUseQueryCall();
      expect(config.select({ results: [] })).toEqual([]);
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useFoodGuide", () => {
    test("happy path — enabled when id is truthy", () => {
      useFoodGuide("food-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["food", "food-1", "guide"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(10 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useFoodGuide("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.guide with the id", async () => {
      useFoodGuide("food-1");
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockGuide).toHaveBeenCalledTimes(1);
      expect(mockGuide).toHaveBeenCalledWith("food-1");
      expect(result).toEqual({
        food_id: "food-1",
        guide: "Eat fresh.",
        version: 1,
        generated_by: "ai",
        generated_at: "2024-01-01T00:00:00Z",
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useMoleculeDetail", () => {
    test("happy path — enabled when id is truthy", () => {
      useMoleculeDetail("mol-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["molecule", "mol-1"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useMoleculeDetail("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.molecule with the id", async () => {
      useMoleculeDetail("mol-1");
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockMolecule).toHaveBeenCalledTimes(1);
      expect(mockMolecule).toHaveBeenCalledWith("mol-1");
      expect(result).toEqual({
        id: "mol-1",
        name: "Caffeine",
        foods: [{ id: "food-2", name: "Coffee" }],
        neutralization_methods: [{ method: "Drink water" }],
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useMoleculeFoods", () => {
    test("happy path — enabled when id is truthy", () => {
      useMoleculeFoods("mol-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["molecule", "mol-1"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useMoleculeFoods("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.molecule with the id", async () => {
      useMoleculeFoods("mol-1");
      const config = lastUseQueryCall();
      await config.queryFn();
      expect(mockMolecule).toHaveBeenCalledTimes(1);
      expect(mockMolecule).toHaveBeenCalledWith("mol-1");
    });

    test("select extracts foods array", () => {
      useMoleculeFoods("mol-1");
      const config = lastUseQueryCall();
      const raw = {
        id: "mol-1",
        name: "Caffeine",
        foods: [{ id: "f1", name: "Coffee" }],
        neutralization_methods: [],
      };
      expect(config.select(raw)).toEqual([{ id: "f1", name: "Coffee" }]);
    });

    test("select returns empty array when foods is empty", () => {
      useMoleculeFoods("mol-1");
      const config = lastUseQueryCall();
      const raw = {
        id: "mol-1",
        name: "Caffeine",
        foods: [],
        neutralization_methods: [{ method: "x" }],
      };
      expect(config.select(raw)).toEqual([]);
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useMoleculeNeutralizations", () => {
    test("happy path — enabled when id is truthy", () => {
      useMoleculeNeutralizations("mol-1");
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["molecule", "mol-1"]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when id is empty string", () => {
      useMoleculeNeutralizations("");
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.molecule with the id", async () => {
      useMoleculeNeutralizations("mol-1");
      const config = lastUseQueryCall();
      await config.queryFn();
      expect(mockMolecule).toHaveBeenCalledTimes(1);
      expect(mockMolecule).toHaveBeenCalledWith("mol-1");
    });

    test("select extracts neutralization_methods array", () => {
      useMoleculeNeutralizations("mol-1");
      const config = lastUseQueryCall();
      const raw = {
        id: "mol-1",
        name: "Caffeine",
        foods: [],
        neutralization_methods: [{ method: "Water" }, { method: "Milk" }],
      };
      expect(config.select(raw)).toEqual([{ method: "Water" }, { method: "Milk" }]);
    });

    test("select returns empty array when neutralization_methods is empty", () => {
      useMoleculeNeutralizations("mol-1");
      const config = lastUseQueryCall();
      const raw = {
        id: "mol-1",
        name: "Caffeine",
        foods: [{ id: "f1", name: "Coffee" }],
        neutralization_methods: [],
      };
      expect(config.select(raw)).toEqual([]);
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useBanList", () => {
    test("happy path — passes correct queryKey and staleTime", () => {
      useBanList();
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["ban-list"]);
      expect(config.staleTime).toBe(2 * 60 * 1000);
    });

    test("queryFn calls api.banList", async () => {
      useBanList();
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockBanList).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ results: [{ id: "bl-1", reason: "Unsafe" }] });
    });

    test("select unwraps data.results", () => {
      useBanList();
      const config = lastUseQueryCall();
      const raw = { results: [{ id: "1" }, { id: "2" }] };
      expect(config.select(raw)).toEqual([{ id: "1" }, { id: "2" }]);
    });

    test("select returns empty array when results is empty", () => {
      useBanList();
      const config = lastUseQueryCall();
      expect(config.select({ results: [] })).toEqual([]);
    });
  });

  /* ---------------------------------------------------------------- */
  describe("useCompare", () => {
    test("happy path — enabled when ids.length >= 2", () => {
      useCompare(["a", "b"]);
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["compare", ["a", "b"]]);
      expect(config.enabled).toBe(true);
      expect(config.staleTime).toBe(5 * 60 * 1000);
    });

    test("disabled when ids has 1 element", () => {
      useCompare(["a"]);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("disabled when ids is empty", () => {
      useCompare([]);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(false);
    });

    test("queryFn calls api.compare with ids array", async () => {
      useCompare(["x", "y", "z"]);
      const config = lastUseQueryCall();
      const result = await config.queryFn();

      expect(mockCompare).toHaveBeenCalledTimes(1);
      expect(mockCompare).toHaveBeenCalledWith(["x", "y", "z"]);
      expect(result).toEqual({
        foods: [{ id: "c1", name: "Apple" }],
        shared_molecules: ["Water"],
        total_unique_molecules: 1,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  describe("adversarial / security", () => {
    /* -- XSS / injection in search -- */
    test("useSearch passes XSS payload through to queryKey and queryFn", () => {
      const xss = "<script>alert('xss')</script>";
      useSearch(xss);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["search", xss]);
      config.queryFn();
      expect(mockSearch).toHaveBeenCalledWith(xss);
    });

    test("useSearch passes SQL injection payload through to queryFn", () => {
      const sql = "'; DROP TABLE foods; --";
      useSearch(sql);
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["search", sql]);
      config.queryFn();
      expect(mockSearch).toHaveBeenCalledWith(sql);
    });

    test("useSearch passes path traversal payload through to queryFn", () => {
      const path = "../../../etc/passwd";
      useSearch(path);
      const config = lastUseQueryCall();
      expect(config.queryKey).toEqual(["search", path]);
      config.queryFn();
      expect(mockSearch).toHaveBeenCalledWith(path);
    });

    /* -- Very long IDs -- */
    test("useFoodDetail accepts 10K character id and passes to queryFn", () => {
      const longId = "x".repeat(10000);
      useFoodDetail(longId);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["food", longId]);
      config.queryFn();
      expect(mockFood).toHaveBeenCalledWith(longId);
    });

    test("useMoleculeDetail accepts 10K character id and passes to queryFn", () => {
      const longId = "m".repeat(10000);
      useMoleculeDetail(longId);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["molecule", longId]);
      config.queryFn();
      expect(mockMolecule).toHaveBeenCalledWith(longId);
    });

    test("useFoodGuide accepts 10K character id and passes to queryFn", () => {
      const longId = "g".repeat(10000);
      useFoodGuide(longId);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["food", longId, "guide"]);
      config.queryFn();
      expect(mockGuide).toHaveBeenCalledWith(longId);
    });

    /* -- Special characters in search -- */
    test("useSearch handles unicode, emoji, and null bytes", () => {
      const query = "apple 🍎 émojis 日本語 \u0000 nullbyte";
      useSearch(query);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["search", query]);
      config.queryFn();
      expect(mockSearch).toHaveBeenCalledWith(query);
    });

    /* -- Empty edge cases -- */
    test("useCompare with empty string IDs in array is enabled", () => {
      useCompare(["", "b"]);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["compare", ["", "b"]]);
      config.queryFn();
      expect(mockCompare).toHaveBeenCalledWith(["", "b"]);
    });

    test("useCompare throws TypeError when ids is null", () => {
      let error: Error | undefined;
      try {
        useCompare(null as unknown as string[]);
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error!.message).toContain("null is not an object");
    });

    test("useCompare throws TypeError when ids is undefined", () => {
      let error: Error | undefined;
      try {
        useCompare(undefined as unknown as string[]);
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error!.message).toContain("undefined is not an object");
    });

    /* -- Race conditions / query key collisions -- */
    test("useCompare rapid sequential calls produce distinct queryKeys", () => {
      useCompare(["a", "b"]);
      const config1 = lastUseQueryCall();
      useCompare(["c", "d"]);
      const config2 = lastUseQueryCall();
      useCompare(["e", "f", "g"]);
      const config3 = lastUseQueryCall();

      expect(config1.queryKey).toEqual(["compare", ["a", "b"]]);
      expect(config2.queryKey).toEqual(["compare", ["c", "d"]]);
      expect(config3.queryKey).toEqual(["compare", ["e", "f", "g"]]);
    });

    test("useCompare same IDs in different order produce distinct queryKeys", () => {
      useCompare(["a", "b"]);
      const config1 = lastUseQueryCall();
      useCompare(["b", "a"]);
      const config2 = lastUseQueryCall();
      expect(config1.queryKey).not.toEqual(config2.queryKey);
    });

    test("useCompare with very large ID array (1000 elements)", () => {
      const ids = Array.from({ length: 1000 }, (_, i) => `id-${i}`);
      useCompare(ids);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["compare", ids]);
      config.queryFn();
      expect(mockCompare).toHaveBeenCalledWith(ids);
    });

    /* -- Error propagation -- */
    test("useHomeData queryFn propagates api.stats rejection", async () => {
      mockStats.mockRejectedValueOnce(new Error("stats failure"));
      useHomeData();
      const config = lastUseQueryCall();

      let error: Error | undefined;
      try {
        await config.queryFn();
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error!.message).toBe("stats failure");
    });

    test("useHomeData queryFn propagates api.foods rejection", async () => {
      mockFoods.mockRejectedValueOnce(new Error("foods failure"));
      useHomeData();
      const config = lastUseQueryCall();

      let error: Error | undefined;
      try {
        await config.queryFn();
      } catch (e) {
        error = e as Error;
      }
      expect(error).toBeDefined();
      expect(error!.message).toBe("foods failure");
    });

    /* -- XSS in food/molecule IDs -- */
    test("useFoodDetail passes XSS payload in id through to queryFn", () => {
      const xssId = "food-<script>alert(1)</script>";
      useFoodDetail(xssId);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["food", xssId]);
      config.queryFn();
      expect(mockFood).toHaveBeenCalledWith(xssId);
    });

    test("useMoleculeDetail passes XSS payload in id through to queryFn", () => {
      const xssId = "mol-<script>alert(1)</script>";
      useMoleculeDetail(xssId);
      const config = lastUseQueryCall();
      expect(config.enabled).toBe(true);
      expect(config.queryKey).toEqual(["molecule", xssId]);
      config.queryFn();
      expect(mockMolecule).toHaveBeenCalledWith(xssId);
    });
  });
});
