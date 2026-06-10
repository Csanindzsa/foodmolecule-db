export interface Food {
  id: string;
  name: string;
  aliases: string[];
  category: string | null;
  origin: string;
  overall_safety_score: number | null;
  health_index: number | null;
  ban_listed: boolean;
  image_url?: string;
  metadata: Record<string, unknown>;
  molecules: FoodMolecule[];
}

export interface FoodMolecule {
  molecule: Molecule;
  amount_per_100g: string | null;
  unit: string;
  amount_notes: string;
  is_beneficial: boolean;
}

export interface Molecule {
  id: string;
  pubchem_cid: number | null;
  name: string;
  iupac_name: string;
  cas_number: string;
  molecular_formula: string;
  molecular_weight: string | null;
  structure_image_url?: string;
  harm_level: number;
  harm_mechanisms: string[];
  is_heat_stable: boolean;
  is_neutralizable: boolean;
}

export interface ProcessingMethod {
  id: number;
  name: string;
  description: string;
  mechanism: string;
  typical_temperature_c: number | null;
  typical_duration_min: number | null;
}

export interface MoleculeNeutralization {
  method: ProcessingMethod | string | null;
  reduction_percent_min: number | null;
  reduction_percent_max: number | null;
  time_required: string;
  notes: string;
  evidence_refs: string[];
  confidence: string;
}

export interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publication_year: number | null;
  url: string;
  abstract: string;
  ai_summary: string | null;
  ai_safety_impact: number | null;
  ai_health_impact: number | null;
  ai_confidence: "high" | "medium" | "low" | null;
  ai_model_used: string | null;
  analyzed_at: string | null;
}

export interface HealthIndexBreakdown {
  food_id: string;
  health_index: number;
  benefit_score: number;
  safety_score: number;
  bioavailability_score: number;
  label: string;
}

export interface FoodListItem {
  id: string;
  name: string;
  category: string | null;
  overall_safety_score: number | null;
  health_index: number | null;
  ban_listed: boolean;
  image_url?: string;
}

export interface BanListEntry {
  id: string;
  food: {
    id: string;
    name: string;
    category: string | null;
    health_index: number | null;
  } | null;
  reason: string;
  lethal_dose_mg: string | null;
  is_conditionally_safe: boolean;
  safe_condition: string;
  regulatory_status: Record<string, unknown>;
}

export interface FoodCompareResult {
  foods: Array<{
    id: string;
    name: string;
    health_index: number;
    safety_score: number;
    molecules: Record<string, number>;
  }>;
  shared_molecules: string[];
  total_unique_molecules: number;
}
