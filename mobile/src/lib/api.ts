import { Platform } from "react-native";

type ExpoProcess = {
  env?: Record<string, string | undefined>;
};

const configuredApiUrl = (globalThis as { process?: ExpoProcess }).process?.env?.EXPO_PUBLIC_API_URL;
const localApiUrl = Platform.OS === "android"
  ? "http://10.0.2.2:8000/api/v1"
  : "http://localhost:8000/api/v1";

const API_BASE = (configuredApiUrl || localApiUrl).replace(/\/$/, "");

function pathId(id: string): string {
  return encodeURIComponent(id);
}

export type FoodListItem = {
  id: string;
  name: string;
  category?: string | null;
  category_name?: string | null;
  overall_safety_score?: number | null;
  health_index?: number | null;
  ban_listed?: boolean;
  image_url?: string;
  molecule_names?: string[];
  max_molecule_harm?: number;
};

export type Molecule = {
  id: string;
  name: string;
  pubchem_cid?: number | null;
  iupac_name?: string;
  cas_number?: string;
  harm_level?: number;
  harm_mechanisms?: string[];
  molecular_formula?: string;
  molecular_weight?: string | null;
  structure_image_url?: string;
  linked_food_count?: number;
  is_heat_stable?: boolean;
  is_neutralizable?: boolean;
};

export type MoleculeFood = {
  id: string;
  name: string;
  category?: string | null;
  amount_per_100g?: string | null;
  unit?: string;
  amount_notes?: string;
  is_beneficial?: boolean;
};

export type MoleculeDetail = Molecule & {
  foods: MoleculeFood[];
};

export type Study = {
  id: string;
  pmid: string;
  title: string;
  journal?: string;
  publication_year?: number | null;
  url?: string;
  ai_summary?: string | null;
  ai_safety_impact?: number | null;
  ai_health_impact?: number | null;
  ai_confidence?: "high" | "medium" | "low" | null;
};

export type FoodGuide = {
  food_id: string;
  guide: string | null;
  version: number;
  generated_by: string;
  generated_at: string;
};

export type HealthBreakdown = {
  food_id: string;
  health_index: number;
  benefit_score: number;
  safety_score: number;
  bioavailability_score: number;
  label: string;
};

export type BanListEntry = {
  id: string;
  food: {
    id: string;
    name: string;
    category?: string | null;
    health_index?: number | null;
  } | null;
  reason: string;
  lethal_dose_mg?: string | null;
  is_conditionally_safe: boolean;
  safe_condition?: string;
  regulatory_status?: Record<string, unknown>;
};

export type FoodDetail = FoodListItem & {
  aliases: string[];
  origin: string;
  molecules: Array<{
    molecule: Molecule;
    amount_per_100g: string | null;
    unit: string;
    is_beneficial: boolean;
  }>;
};

export type SearchResponse = {
  foods: FoodListItem[];
  molecules: Molecule[];
  count: number;
};

export type ScanResponse = SearchResponse & {
  ingredients: string[];
  confidence: number;
  raw_text: string;
  raw_text_truncated?: boolean;
};

export type CompareResponse = {
  foods: Array<{
    id: string;
    name: string;
    health_index: number;
    safety_score: number;
    molecules: Record<string, number>;
  }>;
  shared_molecules: string[];
  total_unique_molecules: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    let detail = `API error: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // Ignore invalid JSON error bodies.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

function imagePath(uri: string): string {
  return uri.split(/[?#]/, 1)[0] ?? "";
}

export function imageName(uri: string): string {
  const name = imagePath(uri).split("/").pop();
  return name && name.includes(".") ? name : "ingredient-label.jpg";
}

export function imageType(uri: string): string {
  const lower = imagePath(uri).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export const api = {
  search: (query: string) => request<SearchResponse>(
    `/foods/search/?q=${encodeURIComponent(query)}&dedupe=ingredient_signature`,
  ),
  food: (id: string) => request<FoodDetail>(`/foods/${pathId(id)}/`),
  molecule: (id: string) => request<MoleculeDetail>(`/molecules/${pathId(id)}/`),
  foodStudies: (id: string) => request<{ results: Study[] }>(`/foods/${pathId(id)}/studies/`),
  recentStudies: () => request<{ results: Study[] }>("/studies/recent/"),
  foodGuide: (id: string) => request<FoodGuide>(`/foods/${pathId(id)}/guide/`),
  foodHealthIndex: (id: string) => request<HealthBreakdown>(`/foods/${pathId(id)}/health-index/`),
  banList: () => request<{ results: BanListEntry[] }>("/ban-list/"),
  compare: (ids: string[]) => request<CompareResponse>(`/foods/compare/?ids=${ids.map(encodeURIComponent).join(",")}`),
  scanImage: (uri: string) => {
    const body = new FormData();
    body.append("image", {
      uri,
      name: imageName(uri),
      type: imageType(uri),
    } as unknown as Blob);

    return request<ScanResponse>("/scan/", {
      method: "POST",
      body,
    });
  },
};
