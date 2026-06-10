import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import FoodDetail from "./FoodDetail";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

/* ------------------------------------------------------------------
 *  Mock hooks
 * ---------------------------------------------------------------- */

const mockRefetchMolecules = mock(() => {});
const mockRefetchStudies = mock(() => {});
const mockRefetchGuide = mock(() => {});

const mockUseFoodDetail = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

const mockUseFoodMolecules = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetchMolecules,
}));

const mockUseFoodStudies = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetchStudies,
}));

const mockUseFoodGuide = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetchGuide,
}));

const mockUseFoodHealthIndex = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

mock.module("../hooks/useApi", () => ({
  useFoodDetail: mockUseFoodDetail,
  useFoodMolecules: mockUseFoodMolecules,
  useFoodStudies: mockUseFoodStudies,
  useFoodGuide: mockUseFoodGuide,
  useFoodHealthIndex: mockUseFoodHealthIndex,
}));

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ["/foods/test-id"]) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/foods/:id" element={children} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

/* ------------------------------------------------------------------
 *  Mock data
 * ---------------------------------------------------------------- */

const mockFood = {
  id: "test-id",
  name: "apple",
  category: "Fruit",
  aliases: [],
  origin: "",
  overall_safety_score: null,
  health_index: 75,
  ban_listed: false,
  image_url: "",
  metadata: {},
  molecules: [
    {
      molecule: { id: "m1", name: "Vitamin C", harm_level: 1, is_beneficial: true },
      amount_per_100g: "50.000000",
      unit: "mg",
      amount_notes: "",
      is_beneficial: true,
    },
  ],
};

const mockHealth = {
  food_id: "test-id",
  health_index: 75,
  benefit_score: 80,
  safety_score: 70,
  bioavailability_score: 60,
  label: "Good",
};

const mockMolecules = mockFood.molecules;

const mockStudies = [
  {
    id: "s1",
    pmid: "12345",
    title: "Health Benefits of Apples",
    ai_summary: "Apples are healthy.",
    publication_year: 2023,
    url: "https://pubmed.ncbi.nlm.nih.gov/12345/",
    ai_confidence: "high",
  },
  {
    id: "s2",
    pmid: "67890",
    title: "Apple Nutrition Study",
    ai_summary: null,
    publication_year: 2022,
    url: "https://pubmed.ncbi.nlm.nih.gov/67890/",
    ai_confidence: null,
  },
];

const mockGuide = {
  food_id: "test-id",
  guide: "Apples are nutritious fruits that can be consumed daily.",
  version: 1,
  generated_by: "ai",
  generated_at: "2024-01-01T00:00:00Z",
};

/* ------------------------------------------------------------------
 *  Tests
 * ---------------------------------------------------------------- */

describe("FoodDetail page", () => {
  beforeEach(() => {
    mockUseFoodDetail.mockClear();
    mockUseFoodMolecules.mockClear();
    mockUseFoodStudies.mockClear();
    mockUseFoodGuide.mockClear();
    mockUseFoodHealthIndex.mockClear();
    mockRefetchMolecules.mockClear();
    mockRefetchStudies.mockClear();
    mockRefetchGuide.mockClear();

    // Reset defaults
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseFoodMolecules.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: mockRefetchMolecules });
    mockUseFoodStudies.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: mockRefetchStudies });
    mockUseFoodGuide.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: mockRefetchGuide });
    mockUseFoodHealthIndex.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  // ─── A) Loading state ───
  test("loading state shows skeleton (animate-pulse divs)", () => {
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = renderWithRouter(<FoodDetail />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(document.body.textContent).not.toContain("apple");
  });

  // ─── B) Error state ───
  test("error state shows 'Failed to load food details' message", () => {
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail") });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Failed to load food details");
    expect(document.body.textContent).toContain("The page may have refreshed or the food no longer exists.");
  });

  // ─── C) Success state — food name and category ───
  test("success state shows food name and category", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("apple");
    expect(document.body.textContent).toContain("Fruit");
  });

  // ─── D) Health index ───
  test("health index shows health_index number and label", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodHealthIndex.mockReturnValue({ data: mockHealth, isLoading: false, error: null });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("75");
    expect(document.body.textContent).toContain("Good");
  });

  // ─── E) Health index loading ───
  test("health index loading shows pulsing circle skeleton", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodHealthIndex.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = renderWithRouter(<FoodDetail />);

    expect(container.querySelector(".animate-pulse.rounded-full")).not.toBeNull();
    expect(document.body.textContent).not.toContain("75");
  });

  // ─── F) Health index error ───
  test("health index error gracefully degrades — no health section visible", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodHealthIndex.mockReturnValue({ data: undefined, isLoading: false, error: new Error("health fail") });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("apple");
    expect(document.body.textContent).not.toContain("75");
    expect(document.body.textContent).not.toContain("Good");
  });

  // ─── G) Molecules list ───
  test("molecules list renders molecule items with name, amount, and harm level badge", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodMolecules.mockReturnValue({ data: mockMolecules, isLoading: false, error: null, refetch: mockRefetchMolecules });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Vitamin C");
    expect(document.body.textContent).toContain("50");
    expect(document.body.textContent).toContain("mg");
    expect(document.body.textContent).toContain("Beneficial");
  });

  // ─── H) Molecules loading ───
  test("molecules loading shows 3 skeleton items", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodMolecules.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetchMolecules });

    const { container } = renderWithRouter(<FoodDetail />);

    const skeletonItems = container.querySelectorAll(".rounded-lg.border.bg-white");
    expect(skeletonItems.length).toBe(3);
  });

  // ─── I) Molecules error ───
  test("molecules error shows 'Failed to load molecules' with Retry button", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodMolecules.mockReturnValue({ data: undefined, isLoading: false, error: new Error("mol fail"), refetch: mockRefetchMolecules });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Failed to load molecules");
    const retryBtn = document.querySelector("button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toBe("Retry");
  });

  // ─── J) Molecules empty ───
  test("molecules empty shows 'No molecule data available.'", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodMolecules.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetchMolecules });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("No molecule data available.");
  });

  // ─── K) Studies list ───
  test("studies list shows up to 5 study cards", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodStudies.mockReturnValue({ data: mockStudies, isLoading: false, error: null, refetch: mockRefetchStudies });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Latest Research");
    expect(document.body.textContent).toContain("Health Benefits of Apples");
    expect(document.body.textContent).toContain("Apple Nutrition Study");
    expect(document.body.textContent).toContain("PMID: 12345");
    expect(document.body.textContent).toContain("2023");
    const citation = document.querySelector('a[href="https://pubmed.ncbi.nlm.nih.gov/12345/"]');
    expect(citation).not.toBeNull();
    expect(citation!.getAttribute("target")).toBe("_blank");
    expect(citation!.getAttribute("rel")).toBe("noreferrer");
    expect(document.body.textContent).toContain("AI confidence: high");
  });

  // ─── L) Studies loading ───
  test("studies loading shows 3 skeleton cards", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodStudies.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetchStudies });

    const { container } = renderWithRouter(<FoodDetail />);

    const studyCards = container.querySelectorAll(".rounded-xl.border.bg-white");
    expect(studyCards.length).toBe(3);
  });

  // ─── M) Studies error ───
  test("studies error shows 'Failed to load studies' with Retry button", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodStudies.mockReturnValue({ data: undefined, isLoading: false, error: new Error("study fail"), refetch: mockRefetchStudies });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Failed to load studies");
    const retryBtn = document.querySelector("button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toBe("Retry");
  });

  // ─── N) Studies empty ───
  test("studies empty does not render studies section at all", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodStudies.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetchStudies });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).not.toContain("Latest Research");
  });

  // ─── O) Agent Guide ───
  test("agent guide shows guide text from useFoodGuide", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodGuide.mockReturnValue({ data: mockGuide, isLoading: false, error: null, refetch: mockRefetchGuide });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Agent Guide");
    expect(document.body.textContent).toContain("Apples are nutritious fruits that can be consumed daily.");
  });

  // ─── P) Agent Guide loading ───
  test("agent guide loading shows pulsing skeleton", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodGuide.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetchGuide });

    const { container } = renderWithRouter(<FoodDetail />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(document.body.textContent).toContain("Agent Guide");
    expect(document.body.textContent).not.toContain("Apples are nutritious fruits");
  });

  // ─── Q) Agent Guide error ───
  test("agent guide error shows 'Failed to load agent guide' with Retry button", () => {
    mockUseFoodDetail.mockReturnValue({ data: mockFood, isLoading: false, error: null });
    mockUseFoodGuide.mockReturnValue({ data: undefined, isLoading: false, error: new Error("guide fail"), refetch: mockRefetchGuide });

    renderWithRouter(<FoodDetail />);

    expect(document.body.textContent).toContain("Failed to load agent guide");
    const retryBtn = document.querySelector("button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toBe("Retry");
  });

  // ─── R) Null food ───
  test("null food after loading renders nothing", () => {
    mockUseFoodDetail.mockReturnValue({ data: null, isLoading: false, error: null });

    const { container } = renderWithRouter(<FoodDetail />);

    expect(container.textContent).toBe("");
  });
});
