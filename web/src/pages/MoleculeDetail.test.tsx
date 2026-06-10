import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import MoleculeDetail from "./MoleculeDetail";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

/* ------------------------------------------------------------------
 *  Mock hooks
 * ---------------------------------------------------------------- */

const mockRefetchFoods = mock(() => {});
const mockRefetchNeutralizations = mock(() => {});

const mockUseMoleculeDetail = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

const mockUseMoleculeFoods = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetchFoods,
}));

const mockUseMoleculeNeutralizations = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetchNeutralizations,
}));

mock.module("../hooks/useApi", () => ({
  useMoleculeDetail: mockUseMoleculeDetail,
  useMoleculeFoods: mockUseMoleculeFoods,
  useMoleculeNeutralizations: mockUseMoleculeNeutralizations,
}));

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ["/molecules/test-id"]) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/molecules/:id" element={children} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

/* ------------------------------------------------------------------
 *  Mock data
 * ---------------------------------------------------------------- */

const mockMolecule = {
  id: "m1",
  pubchem_cid: 12345,
  name: "Caffeine",
  iupac_name: "1,3,7-trimethylpurine-2,6-dione",
  cas_number: "58-08-2",
  molecular_formula: "C8H10N4O2",
  molecular_weight: "194.1900",
  harm_level: 2,
  harm_mechanisms: ["Increases heart rate", "Can cause insomnia"],
  is_heat_stable: true,
  is_neutralizable: true,
};

const mockFoods = [
  { id: "f1", name: "coffee", category: "Beverage", health_index: 70, aliases: [], origin: "", overall_safety_score: null, ban_listed: false, image_url: "", metadata: {}, molecules: [] },
  { id: "f2", name: "black tea", category: "Beverage", health_index: 80, aliases: [], origin: "", overall_safety_score: null, ban_listed: false, image_url: "", metadata: {}, molecules: [] },
];

const mockNeutralizations = [
  {
    method: {
      id: 1,
      name: "Boiling",
      description: "Heat in water",
      mechanism: "Thermal decomposition",
      typical_temperature_c: 100,
      typical_duration_min: 15,
    },
    reduction_percent_min: 30,
    reduction_percent_max: 90,
    time_required: "10-30 minutes",
    notes: "Discard cooking water.",
    evidence_refs: ["12345678"],
    confidence: "high",
  },
  {
    method: {
      id: 2,
      name: "Fermenting",
      description: "Microbial processing",
      mechanism: "Biochemical transformation",
      typical_temperature_c: null,
      typical_duration_min: null,
    },
    reduction_percent_min: null,
    reduction_percent_max: null,
    time_required: "",
    notes: "",
    evidence_refs: [],
    confidence: "",
  },
];

/* ------------------------------------------------------------------
 *  Tests
 * ---------------------------------------------------------------- */

describe("MoleculeDetail page", () => {
  beforeEach(() => {
    mockUseMoleculeDetail.mockClear();
    mockUseMoleculeFoods.mockClear();
    mockUseMoleculeNeutralizations.mockClear();
    mockRefetchFoods.mockClear();
    mockRefetchNeutralizations.mockClear();

    // Reset defaults
    mockUseMoleculeDetail.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: mockRefetchFoods });
    mockUseMoleculeNeutralizations.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: mockRefetchNeutralizations });
  });

  afterEach(() => {
    cleanup();
  });

  // ─── Loading state ───
  test("shows skeleton (animate-pulse divs) when useMoleculeDetail isLoading", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  test("does NOT show molecule name while loading", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: undefined, isLoading: true, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).not.toContain("Caffeine");
  });

  // ─── Error state ───
  test("shows 'Failed to load molecule details' when useMoleculeDetail has error", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail") });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Failed to load molecule details");
  });

  test("shows 'Back to Home' link in error state", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail") });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Back to Home");
  });

  // ─── Success — Header ───
  test("shows molecule name and IUPAC name", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Caffeine");
    expect(document.body.textContent).toContain("1,3,7-trimethylpurine-2,6-dione");
  });

  test("does not render unsafe structure image URLs", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, structure_image_url: "javascript:alert(1)" },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(container.textContent).toContain("Caffeine");
    expect(container.querySelector("img")).toBeNull();
  });

  test("does not show IUPAC name when it's empty string", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, iupac_name: "" },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Caffeine");
    expect(document.body.textContent).not.toContain("1,3,7-trimethylpurine-2,6-dione");
  });

  test("shows Harm Level badge with correct color for harm_level 2 (moderate = yellow)", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Harm Level: 2 — Moderate");
    expect(container.querySelector(".bg-yellow-100")).not.toBeNull();
  });

  test("shows Harm Level badge with correct color for harm_level 4 (high = red)", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, harm_level: 4 },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Harm Level: 4 — High");
    expect(container.querySelector(".bg-red-100")).not.toBeNull();
  });

  test("shows Harm Level badge with correct color for harm_level 1 (low = green)", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, harm_level: 1 },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Harm Level: 1 — Low");
    expect(container.querySelector(".bg-green-100")).not.toBeNull();
  });

  test("shows 'Heat Stable' badge when is_heat_stable is true", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Heat Stable");
  });

  test("shows 'Neutralizable' badge when is_neutralizable is true", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Neutralizable");
  });

  test("does NOT show Heat Stable badge when false", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, is_heat_stable: false },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).not.toContain("Heat Stable");
  });

  // ─── Properties section ───
  test("shows Molecular Formula, Weight, CAS Number, PubChem CID", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Molecular Formula");
    expect(document.body.textContent).toContain("C8H10N4O2");
    expect(document.body.textContent).toContain("Molecular Weight");
    expect(document.body.textContent).toContain("194.19 g/mol");
    expect(document.body.textContent).toContain("CAS Number");
    expect(document.body.textContent).toContain("58-08-2");
    expect(document.body.textContent).toContain("PubChem CID");
    expect(document.body.textContent).toContain("12345");
  });

  test("shows '—' for null molecular_weight", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, molecular_weight: null },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<MoleculeDetail />);

    const propertiesSection = document.body.textContent || "";
    expect(propertiesSection).toContain("Molecular Weight");
    expect(propertiesSection).toContain("—");
  });

  test("shows '—' for null pubchem_cid", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, pubchem_cid: null },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<MoleculeDetail />);

    const propertiesSection = document.body.textContent || "";
    expect(propertiesSection).toContain("PubChem CID");
    expect(propertiesSection).toContain("—");
  });

  // ─── Harm Mechanisms ───
  test("shows harm mechanism list items", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Increases heart rate");
    expect(document.body.textContent).toContain("Can cause insomnia");
  });

  test("does NOT show harm mechanisms section when array is empty", () => {
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, harm_mechanisms: [] },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).not.toContain("Harm Mechanisms");
  });

  // ─── Neutralization Methods ───
  test("shows neutralization methods", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeNeutralizations.mockReturnValue({ data: mockNeutralizations, isLoading: false, error: null, refetch: mockRefetchNeutralizations });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Boiling");
    expect(document.body.textContent).toContain("30-90% reduction");
    expect(document.body.textContent).toContain("10-30 minutes");
    expect(document.body.textContent).toContain("high confidence");
    expect(document.body.textContent).toContain("Fermenting");
  });

  test("shows 'No neutralization methods known.' when array is empty", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeNeutralizations.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetchNeutralizations });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("No neutralization methods known.");
  });

  test("shows loading state (animate-pulse) for neutralizations", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeNeutralizations.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetchNeutralizations });

    const { container } = renderWithRouter(<MoleculeDetail />);

    const neutralizationSection = Array.from(container.querySelectorAll("section")).find(
      (s) => s.textContent?.includes("Neutralization Methods")
    );
    expect(neutralizationSection).not.toBeNull();
    expect(neutralizationSection!.querySelector(".animate-pulse")).not.toBeNull();
  });

  test("shows error state with retry button for neutralizations", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeNeutralizations.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail"), refetch: mockRefetchNeutralizations });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Failed to load neutralization methods");
    const retryBtn = document.querySelector("button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toBe("Retry");
  });

  // ─── Foods section ───
  test("shows food list with names and health index badges", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: mockFoods, isLoading: false, error: null, refetch: mockRefetchFoods });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("coffee");
    expect(document.body.textContent).toContain("black tea");
    expect(document.body.textContent).toContain("70");
    expect(document.body.textContent).toContain("80");
  });

  test("food health badges clamp out-of-range scores and hide non-finite scores", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({
      data: [
        { ...mockFoods[0], id: "high-score", name: "high score", health_index: 150 },
        { ...mockFoods[1], id: "invalid-score", name: "invalid score", health_index: NaN },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetchFoods,
    });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("high score");
    expect(document.body.textContent).toContain("100");
    expect(document.body.textContent).toContain("invalid score");
    expect(document.body.textContent).not.toContain("NaN");
  });

  test("shows 'No food data available.' when foods array is empty", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetchFoods });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("No food data available.");
  });

  test("shows loading state (skeleton) for foods", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetchFoods });

    const { container } = renderWithRouter(<MoleculeDetail />);

    const foodsSection = Array.from(container.querySelectorAll("section")).find(
      (s) => s.textContent?.includes("Foods Containing This Molecule")
    );
    expect(foodsSection).not.toBeNull();
    // Skeleton items have bg-gray-200 placeholder divs
    expect(foodsSection!.querySelectorAll(".bg-gray-200").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("coffee");
  });

  test("shows error state with retry button for foods", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: undefined, isLoading: false, error: new Error("fail"), refetch: mockRefetchFoods });

    renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain("Failed to load foods");
    const retryBtn = document.querySelector("button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toBe("Retry");
  });

  test("food links go to /foods/:id", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: mockFoods, isLoading: false, error: null, refetch: mockRefetchFoods });

    const { container } = renderWithRouter(<MoleculeDetail />);

    const links = container.querySelectorAll('a[href^="/foods/"]');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("/foods/f1");
    expect(links[1].getAttribute("href")).toBe("/foods/f2");
  });

  // ─── Null guard ───
  test("returns nothing when molecule is null after loading", () => {
    mockUseMoleculeDetail.mockReturnValue({ data: null, isLoading: false, error: null });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(container.textContent).toBe("");
  });

  // ─── Adversarial ───
  test("XSS in molecule name renders as text not HTML", () => {
    const xssName = '<script>alert(1)</script>';
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, name: xssName },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain(xssName);
    expect(container.innerHTML).not.toContain("<script>");
  });

  test("XSS in food name renders as text not HTML", () => {
    const xssFoodName = '<img src=x onerror=alert(1)>';
    const xssFoods = [
      { ...mockFoods[0], name: xssFoodName },
    ];
    mockUseMoleculeDetail.mockReturnValue({ data: mockMolecule, isLoading: false, error: null });
    mockUseMoleculeFoods.mockReturnValue({ data: xssFoods, isLoading: false, error: null, refetch: mockRefetchFoods });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain(xssFoodName);
    expect(container.innerHTML).not.toContain("<img");
  });

  test("very long molecule name doesn't crash", () => {
    const longName = "A".repeat(10000);
    mockUseMoleculeDetail.mockReturnValue({
      data: { ...mockMolecule, name: longName },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<MoleculeDetail />);

    expect(document.body.textContent).toContain(longName);
    expect(container.textContent!.length).toBeGreaterThan(0);
  });
});
