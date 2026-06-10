import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

// Mock the useHomeData hook
const mockUseHomeData = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

mock.module("../hooks/useApi", () => ({
  useHomeData: mockUseHomeData,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter> });
}

describe("Home page", () => {
  beforeEach(() => {
    mockUseHomeData.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseHomeData.mockClear();
  });

  test("loading state shows 3 pulsing skeleton cards", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithRouter(<Home />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  test("error state shows error message", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });

    const { getByText } = renderWithRouter(<Home />);

    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
    expect(getByText("Please refresh the page to try again.").textContent).toBe(
      "Please refresh the page to try again."
    );
  });

  test("success state renders stats section and food cards", () => {
    const data = {
      stats: { foods: 150, molecules: 80, studies_analyzed: 300 },
      foods: [
        { id: "1", name: "apple", health_index: 85, category: "Fruit" },
        { id: "2", name: "broccoli", health_index: 90, category: "Vegetable" },
      ],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Home />);

    // Stats displayed with correct values in the stats section
    const statsSection = document.querySelector(".flex.justify-center.gap-8");
    expect(statsSection).not.toBeNull();
    expect(statsSection?.textContent).toContain("150");
    expect(statsSection?.textContent).toContain("foods");
    expect(statsSection?.textContent).toContain("80");
    expect(statsSection?.textContent).toContain("molecules");
    expect(statsSection?.textContent).toContain("300");
    expect(statsSection?.textContent).toContain("studies analyzed");

    // Food cards rendered (capitalize is CSS-only; DOM text is lowercase)
    expect(document.body.textContent).toContain("apple");
    expect(document.body.textContent).toContain("broccoli");

    // Health index badges rendered
    expect(document.body.textContent).toContain("85");
    expect(document.body.textContent).toContain("90");
  });

  test("success state does not render unsafe food image URLs", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [
          { id: "1", name: "apple", health_index: 85, category: "Fruit", image_url: "javascript:alert(1)" },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Home />);

    expect(container.textContent).toContain("apple");
    expect(container.querySelector("img")).toBeNull();
  });

  test("empty foods array renders empty grid", () => {
    const data = {
      stats: { foods: 0, molecules: 0, studies_analyzed: 0 },
      foods: [],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Home />);

    const grid = document.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid?.children.length).toBe(0);
  });

  test("null health_index is handled gracefully — no badge rendered", () => {
    const data = {
      stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
      foods: [
        { id: "1", name: "mystery food", health_index: null, category: "Unknown" },
      ],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    const { getByText } = renderWithRouter(<Home />);

    expect(getByText("mystery food").textContent).toBe("mystery food");

    // No health badge should be rendered
    const healthBadge = document.querySelector(
      ".bg-green-100, .bg-yellow-100, .bg-red-100"
    );
    expect(healthBadge).toBeNull();
  });

  test("food health_index color coding: green for >= 75", () => {
    const data = {
      stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
      foods: [{ id: "1", name: "superfood", health_index: 80, category: "Health" }],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Home />);

    const badge = document.querySelector(".bg-green-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("80");
  });

  test("food health_index color coding: yellow for >= 50 and < 75", () => {
    const data = {
      stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
      foods: [{ id: "1", name: "average food", health_index: 60, category: "Average" }],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Home />);

    const badge = document.querySelector(".bg-yellow-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("60");
  });

  test("food health_index color coding: red for < 50", () => {
    const data = {
      stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
      foods: [{ id: "1", name: "unhealthy food", health_index: 30, category: "Junk" }],
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Home />);

    const badge = document.querySelector(".bg-red-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("30");
  });

  test("only useHomeData is called — no raw fetch", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithRouter(<Home />);

    expect(mockUseHomeData).toHaveBeenCalledTimes(1);
  });

  test("foods are limited to first 6 items", () => {
    const data = {
      stats: { foods: 10, molecules: 5, studies_analyzed: 20 },
      foods: Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        name: `food ${i + 1}`,
        health_index: 70,
        category: "Test",
      })),
    };

    mockUseHomeData.mockReturnValue({
      data,
      isLoading: false,
      error: null,
    });

    const { getByText, queryByText } = renderWithRouter(<Home />);

    // Only first 6 should be rendered (capitalize is CSS-only; DOM text is lowercase)
    expect(getByText("food 1").textContent).toBe("food 1");
    expect(getByText("food 6").textContent).toBe("food 6");
    expect(queryByText("food 7")).toBeNull();
    expect(queryByText("food 10")).toBeNull();
  });
});

describe("Home page — adversarial", () => {
  beforeEach(() => {
    mockUseHomeData.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseHomeData.mockClear();
  });

  // Error state with various error types
  test("error state handles string error", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: "String error message",
    });
    const { getByText } = renderWithRouter(<Home />);
    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
  });

  test("error state handles boolean true error", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: true,
    });
    const { getByText } = renderWithRouter(<Home />);
    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
  });

  test("error state handles plain object error", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { code: 500, status: "Internal Server Error" },
    });
    const { getByText } = renderWithRouter(<Home />);
    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
  });

  test("error state handles number error", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: 404,
    });
    const { getByText } = renderWithRouter(<Home />);
    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
  });

  test("error with XSS-like content renders as text not script", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("<script>alert('xss')</script>"),
    });
    const { container, getByText } = renderWithRouter(<Home />);
    expect(getByText("Failed to load data").textContent).toBe("Failed to load data");
    expect(container.querySelector("script")).toBeNull();
  });

  // Loading + error transition
  test("loading and error simultaneously shows both loading and error", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: new Error("Simultaneous error"),
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
    expect(container.textContent).toContain("Please refresh the page");
  });

  test("transition from loading to error to success renders correctly", () => {
    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { rerender, container } = renderWithRouter(<Home />);
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);

    mockUseHomeData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Load failed"),
    });
    rerender(<Home />);
    expect(container.textContent).toContain("Failed to load data");
    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);

    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "recovery", health_index: 50, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    rerender(<Home />);
    expect(container.textContent).toContain("recovery");
    expect(container.textContent).not.toContain("Failed to load data");
  });

  // Rapid re-renders
  test("rapid re-renders with changing data", () => {
    const { rerender, container } = renderWithRouter(<Home />);

    for (let i = 0; i < 20; i++) {
      mockUseHomeData.mockReturnValue({
        data: {
          stats: { foods: i, molecules: i, studies_analyzed: i },
          foods: [{ id: String(i), name: `food-${i}`, health_index: 50, category: "Test" }],
        },
        isLoading: false,
        error: null,
      });
      rerender(<Home />);
    }

    expect(container.textContent).toContain("food-19");
  });

  // Undefined/null data edge cases
  test("null data renders without crashing", () => {
    mockUseHomeData.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("Featured Foods");
    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  test("undefined foods property renders empty grid", () => {
    mockUseHomeData.mockReturnValue({
      data: { stats: { foods: 1, molecules: 1, studies_analyzed: 1 } },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid?.children.length).toBe(0);
  });

  test("null foods property renders empty grid", () => {
    mockUseHomeData.mockReturnValue({
      data: { stats: { foods: 1, molecules: 1, studies_analyzed: 1 }, foods: null },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid?.children.length).toBe(0);
  });

  test("undefined stats does not render stats section", () => {
    mockUseHomeData.mockReturnValue({
      data: { foods: [] },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).not.toContain("studies analyzed");
  });

  test("null stats does not render stats section", () => {
    mockUseHomeData.mockReturnValue({
      data: { stats: null, foods: [] },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).not.toContain("studies analyzed");
  });

  test("stats with missing fields renders empty placeholders", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 100 },
        foods: [],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("100");
    expect(container.textContent).toContain("foods");
    expect(container.textContent).toContain("molecules");
    expect(container.textContent).toContain("studies analyzed");
  });

  test("undefined health_index does not render a health badge", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "undefined-health", health_index: undefined, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("undefined-health");
    expect(container.querySelector(".bg-red-100")).toBeNull();
  });

  test("missing food id still renders card", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ name: "no-id", health_index: 50, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("no-id");
  });

  test("missing food name renders empty card text", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", health_index: 50, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const grid = container.querySelector(".grid");
    expect(grid?.children.length).toBe(1);
  });

  test("very large foods array is limited to 6 items", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1000000, molecules: 1000000, studies_analyzed: 1000000 },
        foods: Array.from({ length: 1000 }, (_, i) => ({
          id: String(i),
          name: `bulk-food-${i}`,
          health_index: 50,
          category: "Test",
        })),
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const grid = container.querySelector(".grid");
    expect(grid?.children.length).toBe(6);
  });

  test("health_index of 0 renders red badge", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "zero", health_index: 0, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const badge = container.querySelector(".bg-red-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("0");
  });

  test("negative health_index clamps to 0 in a red badge", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "negative", health_index: -10, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const badge = container.querySelector(".bg-red-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("0");
    expect(container.textContent).not.toContain("-10");
  });

  test("health_index above 100 clamps to 100 in a green badge", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "above max", health_index: 150, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    const badge = container.querySelector(".bg-green-100");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("100");
    expect(container.textContent).not.toContain("150");
  });

  test("NaN health_index does not render a health badge", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "nan", health_index: NaN, category: "Test" }],
      },
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("nan");
    expect(container.textContent).not.toContain("NaN");
    expect(container.querySelector(".bg-red-100")).toBeNull();
  });

  test("primitive data value handles gracefully", () => {
    mockUseHomeData.mockReturnValue({
      data: "not an object",
      isLoading: false,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.textContent).toContain("Featured Foods");
    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  test("loading with existing data shows loading state over data", () => {
    mockUseHomeData.mockReturnValue({
      data: {
        stats: { foods: 1, molecules: 1, studies_analyzed: 1 },
        foods: [{ id: "1", name: "existing", health_index: 50, category: "Test" }],
      },
      isLoading: true,
      error: null,
    });
    const { container } = renderWithRouter(<Home />);
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
    expect(container.textContent).not.toContain("existing");
  });
});
