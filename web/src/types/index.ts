export interface Food {
  id: string;
  name: string;
  aliases: string[];
  category: string | null;
  origin: string;
  overall_safety_score: number | null;
  health_index: number | null;
  ban_listed: boolean;
  image_url: string;
  metadata: Record<string, unknown>;
  molecules: FoodMolecule[];
}

export interface FoodMolecule {
  molecule: Molecule;
  amount_per_100g: number | null;
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
  molecular_weight: number | null;
  harm_level: number;
  harm_mechanisms: string[];
  is_heat_stable: boolean;
  is_neutralizable: boolean;
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
