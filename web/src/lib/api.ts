const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
const MAX_SEARCH_QUERY_CHARS = 128;
const MAX_PATH_ID_CHARS = 128;
const MIN_COMPARE_IDS = 2;
const MAX_COMPARE_IDS = 3;

async function fetcher<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  if (!resp.ok) {
    let detail = `API error: ${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // Preserve the status fallback for non-JSON error bodies.
    }
    throw new Error(detail);
  }
  return resp.json() as Promise<T>;
}

function pathId(id: string): string {
  const cleaned = id.trim();
  if (cleaned.length === 0) {
    throw new Error("API IDs must be non-empty.");
  }
  if (cleaned.toLowerCase() === "undefined" || cleaned.toLowerCase() === "null") {
    throw new Error("API IDs must not be placeholder values.");
  }
  if (Array.from(id).length > MAX_PATH_ID_CHARS) {
    throw new Error(`API IDs are limited to ${MAX_PATH_ID_CHARS} characters.`);
  }
  return encodeURIComponent(id);
}

function searchQueryPath(q: string): string {
  if (Array.from(q).length > MAX_SEARCH_QUERY_CHARS) {
    throw new Error(`Search queries are limited to ${MAX_SEARCH_QUERY_CHARS} characters.`);
  }
  return `/foods/search/?q=${encodeURIComponent(q)}`;
}

function compareIdsPath(ids: string[]): string {
  if (ids.length < MIN_COMPARE_IDS || ids.length > MAX_COMPARE_IDS) {
    throw new Error("Compare requires 2-3 food IDs.");
  }
  if (ids.some((id) => id.trim().length === 0)) {
    throw new Error("Compare IDs must be non-empty.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("Compare IDs must be unique.");
  }
  return "/foods/compare/?ids=" + ids.map(encodeURIComponent).join(",");
}

export const api = {
  foods: () => fetcher<{ results: Food[] }>("/foods/"),
  food: (id: string) => fetcher<Food>(`/foods/${pathId(id)}/`),
  foodHealthIndex: (id: string) => fetcher<HealthIndexBreakdown>(`/foods/${pathId(id)}/health-index/`),
  foodStudies: (id: string) => fetcher<{ results: Study[] }>(`/foods/${pathId(id)}/studies/`),
  recentStudies: () => fetcher<{ results: Study[] }>("/studies/recent/"),
  search: (q: string) => fetcher<{ foods: Food[]; molecules: Molecule[] }>(searchQueryPath(q)),
  molecules: () => fetcher<{ results: Molecule[] }>("/molecules/"),
  molecule: (id: string) => fetcher<Molecule>(`/molecules/${pathId(id)}/`),
  stats: () => fetcher<Record<string, number>>("/stats/"),
  banList: () => fetcher<{ results: BanListEntry[] }>("/ban-list/"),
  compare: (ids: string[]) => fetcher<FoodCompareResult>(compareIdsPath(ids)),
  guide: (id: string) => fetcher<{ food_id: string; guide: string | null; version: number; generated_by: string; generated_at: string }>(`/foods/${pathId(id)}/guide/`),
};

export type Food = import("../types").Food;
export type Molecule = import("../types").Molecule;
export type Study = import("../types").Study;
export type HealthIndexBreakdown = import("../types").HealthIndexBreakdown;
export type FoodListItem = import("../types").FoodListItem;
export type BanListEntry = import("../types").BanListEntry;
export type FoodCompareResult = import("../types").FoodCompareResult;
export type MoleculeNeutralization = import("../types").MoleculeNeutralization;
