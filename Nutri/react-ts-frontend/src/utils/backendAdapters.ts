import { API_ENDPOINTS } from "../config/environment";
import { EntityId, Food, Ingredient, MacroTable, Restaurant } from "../interfaces";

type PaginatedResponse<T> = {
  results?: T[];
  next?: string | null;
};

type BackendMolecule = {
  id: string;
  name: string;
  iupac_name?: string;
  cas_number?: string;
  molecular_formula?: string;
  molecular_weight?: string | number | null;
  harm_level?: number | null;
  harm_mechanisms?: string[];
  classification_reasoning?: {
    positive?: string[];
    negative?: string[];
    explanation?: string;
  };
  is_heat_stable?: boolean;
  is_neutralizable?: boolean;
  structure_image_url?: string;
  metadata?: Record<string, unknown>;
};

type BackendFoodMolecule = {
  molecule: BackendMolecule;
  amount_per_100g?: string | number | null;
  unit?: string;
  amount_notes?: string;
  is_beneficial?: boolean;
};

type BackendFood = {
  id: string;
  name: string;
  aliases?: string[];
  category?: EntityId | null;
  category_name?: string | null;
  origin?: string;
  overall_safety_score?: number | null;
  health_index?: number | null;
  ban_listed?: boolean;
  image_url?: string;
  metadata?: Record<string, any>;
  molecule_ids?: string[];
  molecule_names?: string[];
  max_molecule_harm?: number | null;
  molecules?: BackendFoodMolecule[];
};

const emptyMacros: MacroTable = {
  energy_kcal: 0,
  fat: 0,
  saturated_fat: 0,
  carbohydrates: 0,
  sugars: 0,
  fiber: 0,
  protein: 0,
  salt: 0,
};

const asNumber = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampHazard = (value: unknown): 0 | 1 | 2 | 3 | 4 | 5 => {
  const number = Math.round(asNumber(value, 0));
  return Math.max(0, Math.min(5, number)) as 0 | 1 | 2 | 3 | 4 | 5;
};

const safetyScoreToHazard = (score: unknown) => {
  if (score === null || score === undefined || score === "") return 0;
  return clampHazard(5 - asNumber(score, 100) / 20);
};

const extractList = <T>(payload: T[] | PaginatedResponse<T>): T[] =>
  Array.isArray(payload) ? payload : payload.results ?? [];

const fetchAllPages = async <T>(url: string): Promise<T[]> => {
  const items: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as T[] | PaginatedResponse<T>;
    items.push(...extractList(payload));
    nextUrl = Array.isArray(payload) ? null : payload.next ?? null;
  }

  return items;
};

export const mapMoleculeToIngredient = (molecule: BackendMolecule): Ingredient => {
  const details = [
    molecule.molecular_formula,
    molecule.cas_number ? `CAS ${molecule.cas_number}` : "",
    ...(molecule.harm_mechanisms ?? []),
  ].filter(Boolean);

  return {
    id: molecule.id,
    name: molecule.name,
    description:
      details.length > 0
        ? details.join(" · ")
        : molecule.iupac_name || "Molecule profile from the Nutrii backend.",
    hazard_level: clampHazard(molecule.harm_level),
    classification_reasoning: molecule.classification_reasoning ?? {},
  };
};

export const mapFoodToFood = (food: BackendFood): Food => {
  const metadata = food.metadata ?? {};
  const nutrition = metadata.nutrition_per_100g ?? metadata.nutrition ?? {};
  const moleculeIds =
    food.molecules?.map((item) => item.molecule.id) ?? food.molecule_ids ?? [];
  const dietaryPreferences = Array.isArray(metadata.dietary_preferences)
    ? metadata.dietary_preferences
    : Array.isArray(metadata.tags)
      ? metadata.tags
      : [];
  const categoryName = food.category_name || "Nutrii database";
  const hazardLevel =
    food.max_molecule_harm !== undefined && food.max_molecule_harm !== null
      ? clampHazard(food.max_molecule_harm)
      : safetyScoreToHazard(food.overall_safety_score);

  return {
    id: food.id,
    restaurant: food.category ?? categoryName,
    restaurant_name: categoryName,
    name: food.name,
    serving_size: asNumber(metadata.serving_size_g, 100),
    macro_table: {
      energy_kcal: asNumber(nutrition.energy_kcal),
      fat: asNumber(nutrition.fat),
      saturated_fat: asNumber(nutrition.saturated_fat),
      carbohydrates: asNumber(nutrition.carbohydrates),
      sugars: asNumber(nutrition.sugars),
      fiber: asNumber(nutrition.fiber),
      protein: asNumber(nutrition.protein),
      salt: asNumber(nutrition.salt),
    },
    is_organic: Boolean(metadata.is_organic),
    is_gluten_free: Boolean(metadata.is_gluten_free),
    is_alcohol_free: Boolean(metadata.is_alcohol_free ?? true),
    is_lactose_free: Boolean(metadata.is_lactose_free),
    ingredients: moleculeIds,
    image: food.image_url || undefined,
    hazard_level: hazardLevel,
    dietary_preferences: dietaryPreferences.map(String),
  };
};

export const makeFeaturedCards = (foods: Food[]): Restaurant[] =>
  foods.slice(0, 4).map((food) => ({
    id: food.id,
    name: food.name,
    foods_on_menu: 1,
    description: food.restaurant_name,
    image: food.image,
    cuisine: food.restaurant_name || "Food and molecule profile",
    hazard_level: food.hazard_level,
  }));

export const loadPublicCatalog = async () => {
  const [backendFoods, backendMolecules] = await Promise.all([
    fetchAllPages<BackendFood>(API_ENDPOINTS.foods),
    fetchAllPages<BackendMolecule>(API_ENDPOINTS.ingredients),
  ]);

  const foods = backendFoods.map(mapFoodToFood);
  const ingredients = backendMolecules.map(mapMoleculeToIngredient);
  const restaurants = makeFeaturedCards(foods);

  return { foods, ingredients, restaurants };
};

export const loadFoodDetail = async (foodId: EntityId): Promise<Food> => {
  const response = await fetch(API_ENDPOINTS.foodDetail(foodId));
  if (!response.ok) {
    throw new Error("Food not found");
  }

  return mapFoodToFood((await response.json()) as BackendFood);
};

export const loadIngredientDetail = async (
  ingredientId: EntityId,
): Promise<Ingredient> => {
  const response = await fetch(API_ENDPOINTS.ingredientDetail(ingredientId));
  if (!response.ok) {
    throw new Error("Ingredient not found");
  }

  return mapMoleculeToIngredient((await response.json()) as BackendMolecule);
};

export const fallbackMacroTable = emptyMacros;
