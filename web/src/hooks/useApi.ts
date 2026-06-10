import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  Food,
  Molecule,
  HealthIndexBreakdown,
  MoleculeNeutralization,
} from "../lib/api";

/**
 * Extended molecule response from api.molecule(), including related foods
 * and neutralization methods not present on the base Molecule type.
 */
interface MoleculeDetail extends Molecule {
  foods: Food[];
  neutralization_methods: MoleculeNeutralization[];
}

const STALE_TIME_2_MIN = 2 * 60 * 1000;
const STALE_TIME_5_MIN = 5 * 60 * 1000;
const STALE_TIME_10_MIN = 10 * 60 * 1000;

/**
 * Fetch home page data: stats and foods list in parallel.
 * QueryKey: `["home"]`. staleTime: 5 minutes.
 */
export function useHomeData() {
  return useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [stats, foodsData] = await Promise.all([
        api.stats(),
        api.foods(),
      ]);
      return { stats, foods: foodsData.results };
    },
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Search foods and molecules by query string.
 * QueryKey: `["search", query]`. Enabled when query is non-empty.
 * staleTime: 2 minutes.
 */
export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query.length > 0,
    staleTime: STALE_TIME_2_MIN,
  });
}

/**
 * Fetch detailed data for a single food.
 * QueryKey: `["food", id]`. Enabled when id is truthy.
 * staleTime: 5 minutes.
 */
export function useFoodDetail(id: string) {
  return useQuery({
    queryKey: ["food", id],
    queryFn: () => api.food(id),
    enabled: !!id,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Selector hook that reads `molecules` from the cached food detail query.
 * Shares cache with `useFoodDetail`. QueryKey: `["food", id]`.
 * Enabled when id is truthy. staleTime: 5 minutes.
 */
export function useFoodMolecules(id: string) {
  return useQuery({
    queryKey: ["food", id],
    queryFn: () => api.food(id),
    enabled: !!id,
    select: (data) => data.molecules,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Fetch studies associated with a food.
 * QueryKey: `["food", id, "studies"]`. Enabled when id is truthy.
 * Selects `results` array. staleTime: 5 minutes.
 */
export function useFoodStudies(id: string) {
  return useQuery({
    queryKey: ["food", id, "studies"],
    queryFn: () => api.foodStudies(id),
    enabled: !!id,
    select: (data) => data.results,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Fetch the latest AI-analyzed PubMed studies.
 * QueryKey: `["studies", "recent"]`. Selects `results` array.
 * staleTime: 5 minutes.
 */
export function useRecentStudies() {
  return useQuery({
    queryKey: ["studies", "recent"],
    queryFn: () => api.recentStudies(),
    select: (data) => data.results,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Fetch the AI-generated guide for a food.
 * QueryKey: `["food", id, "guide"]`. Enabled when id is truthy.
 * staleTime: 10 minutes.
 */
export function useFoodGuide(id: string) {
  return useQuery({
    queryKey: ["food", id, "guide"],
    queryFn: () => api.guide(id),
    enabled: !!id,
    staleTime: STALE_TIME_10_MIN,
  });
}

/**
 * Fetch the health index breakdown for a food.
 * QueryKey: `["food", id, "health-index"]`. Enabled when id is truthy.
 * staleTime: 5 minutes.
 */
export function useFoodHealthIndex(id: string) {
  return useQuery<HealthIndexBreakdown>({
    queryKey: ["food", id, "health-index"],
    queryFn: () => api.foodHealthIndex(id),
    enabled: !!id,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Fetch detailed data for a single molecule (includes foods and neutralizations).
 * QueryKey: `["molecule", id]`. Enabled when id is truthy.
 * staleTime: 5 minutes.
 */
export function useMoleculeDetail(id: string) {
  return useQuery<MoleculeDetail>({
    queryKey: ["molecule", id],
    queryFn: () => api.molecule(id) as Promise<MoleculeDetail>,
    enabled: !!id,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Selector hook that reads `foods` from the cached molecule detail query.
 * Shares cache with `useMoleculeDetail`. QueryKey: `["molecule", id]`.
 * Enabled when id is truthy. staleTime: 5 minutes.
 */
export function useMoleculeFoods(id: string) {
  return useQuery({
    queryKey: ["molecule", id],
    queryFn: () => api.molecule(id) as Promise<MoleculeDetail>,
    enabled: !!id,
    select: (data) => data.foods,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Selector hook that reads `neutralization_methods` from the cached molecule
 * detail query. Shares cache with `useMoleculeDetail`.
 * QueryKey: `["molecule", id]`. Enabled when id is truthy.
 * staleTime: 5 minutes.
 */
export function useMoleculeNeutralizations(id: string) {
  return useQuery({
    queryKey: ["molecule", id],
    queryFn: () => api.molecule(id) as Promise<MoleculeDetail>,
    enabled: !!id,
    select: (data) => data.neutralization_methods,
    staleTime: STALE_TIME_5_MIN,
  });
}

/**
 * Fetch the ban list entries.
 * QueryKey: `["ban-list"]`. Selects `results` array.
 * staleTime: 2 minutes.
 */
export function useBanList() {
  return useQuery({
    queryKey: ["ban-list"],
    queryFn: () => api.banList(),
    select: (data) => data.results,
    staleTime: STALE_TIME_2_MIN,
  });
}

/**
 * Compare multiple foods by their IDs.
 * QueryKey: `["compare", ids]`. Enabled when at least 2 IDs are provided.
 * staleTime: 5 minutes.
 */
export function useCompare(ids: string[]) {
  return useQuery({
    queryKey: ["compare", ids],
    queryFn: () => api.compare(ids),
    enabled: ids.length >= 2,
    staleTime: STALE_TIME_5_MIN,
  });
}
