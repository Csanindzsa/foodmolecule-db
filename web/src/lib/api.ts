const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

async function fetcher<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  foods: () => fetcher<{ results: Food[] }>("/foods/"),
  food: (id: string) => fetcher<Food>(`/foods/${id}/`),
  foodHealthIndex: (id: string) => fetcher<HealthIndexBreakdown>(`/foods/${id}/health-index/`),
  foodStudies: (id: string) => fetcher<{ results: Study[] }>(`/foods/${id}/studies/`),
  search: (q: string) => fetcher<{ foods: Food[]; molecules: Molecule[] }>(`/foods/search/?q=${encodeURIComponent(q)}`),
  molecules: () => fetcher<{ results: Molecule[] }>("/molecules/"),
  molecule: (id: string) => fetcher<Molecule>(`/molecules/${id}/`),
  stats: () => fetcher<Record<string, number>>("/stats/"),
  banList: () => fetcher<{ results: BanListEntry[] }>("/ban-list/"),
  compare: (ids: string[]) => {
    if (ids.length === 0) throw new Error("compare requires at least one food ID");
    return fetcher<FoodCompareResult>("/foods/compare/?ids=" + ids.join(","));
  },
  guide: (id: string) => fetcher<{ food_id: string; guide: string | null; version: number; generated_by: string; generated_at: string }>(`/foods/${id}/guide/`),
};

export type Food = import("../types").Food;
export type Molecule = import("../types").Molecule;
export type Study = import("../types").Study;
export type HealthIndexBreakdown = import("../types").HealthIndexBreakdown;
export type FoodListItem = import("../types").FoodListItem;
export type BanListEntry = import("../types").BanListEntry;
export type FoodCompareResult = import("../types").FoodCompareResult;
