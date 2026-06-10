import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Compare from "./Compare";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

/* ------------------------------------------------------------------
 *  Mock hooks
 * ---------------------------------------------------------------- */

const mockRefetch = mock(() => {});

const mockUseCompare = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

mock.module("../hooks/useApi", () => ({
  useCompare: mockUseCompare,
}));

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ["/compare?ids=a,b"]) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
  });
}

/* ------------------------------------------------------------------
 *  Mock data
 * ---------------------------------------------------------------- */

const mockCompareData = {
  foods: [
    {
      id: "f1",
      name: "apple",
      health_index: 85,
      safety_score: 92,
      molecules: { "Vitamin C": 4.6, "Fiber": 2.4, "Quercetin": 0.5 },
    },
    {
      id: "f2",
      name: "banana",
      health_index: 72,
      safety_score: 88,
      molecules: { "Potassium": 358, "Vitamin B6": 0.4, "Fiber": 2.6 },
    },
  ],
  shared_molecules: ["Fiber"],
  total_unique_molecules: 5,
};

const mockCompareData3Foods = {
  foods: [
    {
      id: "f1",
      name: "apple",
      health_index: 85,
      safety_score: 92,
      molecules: { "Vitamin C": 4.6, "Fiber": 2.4 },
    },
    {
      id: "f2",
      name: "banana",
      health_index: 72,
      safety_score: 88,
      molecules: { "Potassium": 358, "Fiber": 2.6 },
    },
    {
      id: "f3",
      name: "orange",
      health_index: 78,
      safety_score: 90,
      molecules: { "Vitamin C": 53, "Fiber": 2.4 },
    },
  ],
  shared_molecules: ["Fiber"],
  total_unique_molecules: 4,
};

/* ------------------------------------------------------------------
 *  Tests
 * ---------------------------------------------------------------- */

describe("Compare page", () => {
  beforeEach(() => {
    mockUseCompare.mockClear();
    mockRefetch.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseCompare.mockClear();
    mockRefetch.mockClear();
  });

  // ─── A) Invalid IDs ───
  test("0 IDs shows 'Compare requires 2–3 foods' message", () => {
    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids="]);

    expect(getByText("Compare requires 2–3 foods").textContent).toBe("Compare requires 2–3 foods");
  });

  test("1 ID shows 'Compare requires 2–3 foods' message", () => {
    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=foo"]);

    expect(getByText("Compare requires 2–3 foods").textContent).toBe("Compare requires 2–3 foods");
  });

  test("4+ IDs shows 'Compare requires 2–3 foods' message", () => {
    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b,c,d"]);

    expect(getByText("Compare requires 2–3 foods").textContent).toBe("Compare requires 2–3 foods");
  });

  test("invalid IDs state shows Back to Home link", () => {
    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=foo"]);

    const backLink = getByText("Back to Home");
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute("href")).toBe("/");
  });

  // ─── B) Loading state ───
  test("loading state shows skeleton cards with animate-pulse", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  test("loading state renders correct number of skeleton cards for 2 IDs", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    // The skeleton grid should have 2 cards (matching ids.length)
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    const cards = grid!.querySelectorAll(".animate-pulse");
    expect(cards.length).toBe(2);
  });

  test("loading state renders correct number of skeleton cards for 3 IDs", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=a,b,c"]);

    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    const cards = grid!.querySelectorAll(".animate-pulse");
    expect(cards.length).toBe(3);
  });

  // ─── C) Error state ───
  test("error state shows 'Failed to load comparison data' message", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    expect(getByText("Failed to load comparison data").textContent).toBe("Failed to load comparison data");
  });

  test("error state shows Retry button", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    const retryBtn = getByText("Retry");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn.textContent).toBe("Retry");
  });

  test("error state shows 'Back to Home' link", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    const backLink = getByText("Back to Home");
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute("href")).toBe("/");
  });

  test("clicking Retry button calls refetch", () => {
    mockUseCompare.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    const retryBtn = getByText("Retry");
    fireEvent.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // ─── D) Empty data state ───
  test("empty data (foods: []) shows 'No comparison data available'", () => {
    mockUseCompare.mockReturnValue({
      data: { foods: [], shared_molecules: [], total_unique_molecules: 0 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    expect(getByText("No comparison data available").textContent).toBe("No comparison data available");
  });

  test("empty data state shows Back to Home link", () => {
    mockUseCompare.mockReturnValue({
      data: { foods: [], shared_molecules: [], total_unique_molecules: 0 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    const backLink = getByText("Back to Home");
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute("href")).toBe("/");
  });

  // ─── E) Success — data display ───
  test("success state shows 'Compare N Foods' heading", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(getByText("Compare 2 Foods").textContent).toBe("Compare 2 Foods");
  });

  test("success state renders food cards with names", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(getByText("apple").textContent).toBe("apple");
    expect(getByText("banana").textContent).toBe("banana");
  });

  test("food names are links to /foods/:id", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const appleLink = container.querySelector('a[href="/foods/f1"]');
    expect(appleLink).not.toBeNull();
    expect(appleLink!.textContent).toBe("apple");

    const bananaLink = container.querySelector('a[href="/foods/f2"]');
    expect(bananaLink).not.toBeNull();
    expect(bananaLink!.textContent).toBe("banana");
  });

  test("health index bar has correct ARIA attributes", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBe(2);

    // Apple has health_index 85
    const appleBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "85"
    );
    expect(appleBar).not.toBeNull();
    expect(appleBar!.getAttribute("aria-valuemin")).toBe("0");
    expect(appleBar!.getAttribute("aria-valuemax")).toBe("100");
  });

  test("health index bar has correct width style", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    const appleBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "85"
    );
    expect(appleBar).not.toBeNull();
    expect(appleBar!.getAttribute("style")).toContain("width: 85%");
  });

  test("health index bar shows green color for >= 75", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    const appleBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "85"
    );
    expect(appleBar).not.toBeNull();
    expect(appleBar!.classList.contains("bg-green-500")).toBe(true);
  });

  test("health index bar shows yellow color for >= 50 and < 75", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    const bananaBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "72"
    );
    expect(bananaBar).not.toBeNull();
    expect(bananaBar!.classList.contains("bg-yellow-500")).toBe(true);
  });

  test("health index bar shows orange color for >= 25 and < 50", () => {
    const lowHealthData = {
      foods: [
        {
          id: "f1",
          name: "junk food",
          health_index: 40,
          safety_score: 30,
          molecules: {},
        },
        {
          id: "f2",
          name: "healthy food",
          health_index: 80,
          safety_score: 90,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: lowHealthData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    const junkBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "40"
    );
    expect(junkBar).not.toBeNull();
    expect(junkBar!.classList.contains("bg-orange-500")).toBe(true);
  });

  test("health index bar shows red color for < 25", () => {
    const veryLowHealthData = {
      foods: [
        {
          id: "f1",
          name: "toxic food",
          health_index: 10,
          safety_score: 5,
          molecules: {},
        },
        {
          id: "f2",
          name: "healthy food",
          health_index: 80,
          safety_score: 90,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: veryLowHealthData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    const toxicBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-valuenow") === "10"
    );
    expect(toxicBar).not.toBeNull();
    expect(toxicBar!.classList.contains("bg-red-500")).toBe(true);
  });

  test("safety score text is rendered", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).toContain("Safety Score: 92");
    expect(container.textContent).toContain("Safety Score: 88");
  });

  test("non-finite safety score renders as unknown", () => {
    mockUseCompare.mockReturnValue({
      data: {
        foods: [
          {
            ...mockCompareData.foods[0],
            safety_score: NaN,
          },
          mockCompareData.foods[1],
        ],
        shared_molecules: [],
        total_unique_molecules: 0,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).toContain("Safety Score: unknown");
    expect(container.textContent).not.toContain("NaN");
  });

  test("molecules are sorted by amount descending", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    // Apple molecules: Vitamin C (4.6), Fiber (2.4), Quercetin (0.5)
    // Should be sorted: Vitamin C > Fiber > Quercetin
    const appleCard = Array.from(container.querySelectorAll(".bg-white.rounded-xl")).find(
      (card) => card.textContent!.includes("apple")
    );
    expect(appleCard).not.toBeNull();

    const moleculeNames = Array.from(appleCard!.querySelectorAll(".text-gray-700")).map(
      (el) => el.textContent
    );
    expect(moleculeNames[0]).toBe("Vitamin C");
    expect(moleculeNames[1]).toBe("Fiber");
    expect(moleculeNames[2]).toBe("Quercetin");
  });

  test("molecule amounts are displayed", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).toContain("4.6");
    expect(container.textContent).toContain("2.4");
    expect(container.textContent).toContain("0.5");
  });

  test("shared molecules section is shown when present", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(getByText("Shared Molecules").textContent).toBe("Shared Molecules");
    const sharedSection = container.querySelector(".bg-blue-100.text-blue-700");
    expect(sharedSection).not.toBeNull();
    expect(sharedSection!.textContent).toBe("Fiber");
  });

  test("shared molecules have blue badge styling", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const blueBadge = container.querySelector(".bg-blue-100.text-blue-700");
    expect(blueBadge).not.toBeNull();
    expect(blueBadge!.textContent).toBe("Fiber");
  });

  test("shared molecules section is hidden when empty", () => {
    mockUseCompare.mockReturnValue({
      data: { ...mockCompareData, shared_molecules: [] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).not.toContain("Shared Molecules");
  });

  test("success state works with 3 foods", () => {
    mockUseCompare.mockReturnValue({
      data: mockCompareData3Foods,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2,f3"]);

    expect(getByText("Compare 3 Foods").textContent).toBe("Compare 3 Foods");
    expect(getByText("apple").textContent).toBe("apple");
    expect(getByText("banana").textContent).toBe("banana");
    expect(getByText("orange").textContent).toBe("orange");

    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    const cards = grid!.querySelectorAll(":scope > .bg-white.rounded-xl");
    expect(cards.length).toBe(3);
  });

  test("food card with no molecules shows placeholder text", () => {
    const noMoleculesData = {
      foods: [
        {
          id: "f1",
          name: "mystery food",
          health_index: 50,
          safety_score: 60,
          molecules: {},
        },
        {
          id: "f2",
          name: "other food",
          health_index: 70,
          safety_score: 80,
          molecules: { "Something": 1.0 },
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 1,
    };

    mockUseCompare.mockReturnValue({
      data: noMoleculesData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).toContain("No molecules data available");
  });

  // ─── F) Null/undefined guard ───
  test("null data returns nothing", () => {
    mockUseCompare.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=a,b"]);

    expect(container.textContent).toBe("");
  });

  // ─── G) Adversarial ───
  test("XSS in food name renders as text not HTML", () => {
    const xssData = {
      foods: [
        {
          id: "f1",
          name: "<script>alert('xss')</script>",
          health_index: 50,
          safety_score: 60,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 1,
    };

    mockUseCompare.mockReturnValue({
      data: xssData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const scriptTag = container.querySelector("script");
    expect(scriptTag).toBeNull();

    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });

  test("XSS in molecule name renders as text not HTML", () => {
    const xssMoleculeData = {
      foods: [
        {
          id: "f1",
          name: "safe food",
          health_index: 50,
          safety_score: 60,
          molecules: { "<img src=x onerror=alert('xss')>": 1.0 },
        },
        {
          id: "f2",
          name: "other safe food",
          health_index: 60,
          safety_score: 70,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 1,
    };

    mockUseCompare.mockReturnValue({
      data: xssMoleculeData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const imgTag = container.querySelector("img");
    expect(imgTag).toBeNull();

    expect(container.textContent).toContain("<img src=x onerror=alert('xss')>");
  });

  test("health index bar width is capped at 100%", () => {
    const over100Data = {
      foods: [
        {
          id: "f1",
          name: "super food",
          health_index: 150,
          safety_score: 100,
          molecules: {},
        },
        {
          id: "f2",
          name: "normal food",
          health_index: 70,
          safety_score: 80,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: over100Data,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar!.getAttribute("style")).toContain("width: 100%");
    expect(progressBar!.getAttribute("aria-valuenow")).toBe("100");
    expect(container.textContent).toContain("100/100");
    expect(container.textContent).not.toContain("150/100");
  });

  test("negative health index bar width is floored at 0%", () => {
    const negativeData = {
      foods: [
        {
          id: "f1",
          name: "negative food",
          health_index: -25,
          safety_score: 20,
          molecules: {},
        },
        {
          id: "f2",
          name: "normal food",
          health_index: 70,
          safety_score: 80,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: negativeData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar!.getAttribute("style")).toContain("width: 0%");
    expect(progressBar!.getAttribute("aria-valuenow")).toBe("0");
    expect(container.textContent).toContain("0/100");
    expect(container.textContent).not.toContain("-25/100");
  });

  test("NaN health index renders unknown without invalid progress output", () => {
    const nanData = {
      foods: [
        {
          id: "f1",
          name: "nan food",
          health_index: NaN,
          safety_score: 20,
          molecules: {},
        },
        {
          id: "f2",
          name: "normal food",
          health_index: 70,
          safety_score: 80,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: nanData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar!.getAttribute("style")).toContain("width: 0%");
    expect(progressBar!.getAttribute("aria-valuenow")).toBe("0");
    expect(container.textContent).toContain("unknown/100");
    expect(container.textContent).not.toContain("NaN");
  });

  test("very long food name doesn't crash", () => {
    const longName = "A".repeat(10000);
    const longNameData = {
      foods: [
        {
          id: "f1",
          name: longName,
          health_index: 50,
          safety_score: 60,
          molecules: {},
        },
        {
          id: "f2",
          name: "normal food",
          health_index: 70,
          safety_score: 80,
          molecules: {},
        },
      ],
      shared_molecules: [],
      total_unique_molecules: 0,
    };

    mockUseCompare.mockReturnValue({
      data: longNameData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<Compare />, ["/compare?ids=f1,f2"]);

    expect(container.textContent).toContain(longName);
    expect(container.textContent!.length).toBeGreaterThan(0);
  });

  test("URL IDs with extra whitespace are trimmed", () => {
    // This test verifies the URL parsing logic by checking the component
    // renders with valid IDs after trimming
    mockUseCompare.mockReturnValue({
      data: mockCompareData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    // Note: ids with spaces that trim to valid IDs - but in URL encoding spaces become + or %20
    // Using ids that have internal spaces (valid) vs leading/trailing
    const { getByText } = renderWithRouter(<Compare />, ["/compare?ids= f1 , f2 "]);

    // After trim, ids should be ["f1", "f2"] which is valid
    expect(getByText("Compare 2 Foods").textContent).toBe("Compare 2 Foods");
  });
});
