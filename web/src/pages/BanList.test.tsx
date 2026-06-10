import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BanList from "./BanList";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

/* ------------------------------------------------------------------
 *  Mock hooks
 * ---------------------------------------------------------------- */

const mockRefetch = mock(() => {});

const mockUseBanList = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

mock.module("../hooks/useApi", () => ({
  useBanList: mockUseBanList,
}));

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function renderWithRouter(ui: React.ReactElement) {
  return render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter> });
}

/* ------------------------------------------------------------------
 *  Mock data
 * ---------------------------------------------------------------- */

const mockEntries = [
  {
    id: "1",
    food: { id: "f1", name: "trans fat", category: "Additive", health_index: 10 },
    reason: "Increases cardiovascular disease risk",
    lethal_dose_mg: null,
    is_conditionally_safe: true,
    safe_condition: "Limit to < 2g per day",
    regulatory_status: {},
  },
  {
    id: "2",
    food: { id: "f2", name: "raw milk", category: "Dairy", health_index: 65 },
    reason: "Risk of bacterial contamination including E. coli and Salmonella",
    lethal_dose_mg: null,
    is_conditionally_safe: false,
    safe_condition: "",
    regulatory_status: {},
  },
  {
    id: "3",
    food: null,
    reason: "Banned substance",
    lethal_dose_mg: "500.0000",
    is_conditionally_safe: false,
    safe_condition: "",
    regulatory_status: {},
  },
];

/* ------------------------------------------------------------------
 *  Tests
 * ---------------------------------------------------------------- */

describe("BanList page", () => {
  beforeEach(() => {
    mockUseBanList.mockClear();
    mockRefetch.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseBanList.mockClear();
    mockRefetch.mockClear();
  });

  // ─── A) Loading state ───
  test("loading state shows animated skeleton", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  test("loading state shows 'Ban List' heading", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    expect(getByText("Ban List").textContent).toBe("Ban List");
  });

  // ─── B) Error state ───
  test("error state shows 'Failed to load ban list' message", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    expect(getByText("Failed to load ban list").textContent).toBe("Failed to load ban list");
  });

  test("error state shows 'Retry' button", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    const retryBtn = getByText("Retry");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn.textContent).toBe("Retry");
  });

  test("error state shows 'Back to Home' link", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    const backLink = getByText("Back to Home");
    expect(backLink).not.toBeNull();
    expect(backLink.textContent).toBe("Back to Home");
    expect(backLink.getAttribute("href")).toBe("/");
  });

  // ─── C) Empty state ───
  test("empty state shows 'No ban list entries found.'", () => {
    mockUseBanList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    expect(getByText("No ban list entries found.").textContent).toBe("No ban list entries found.");
  });

  test("success state surfaces draft citation gate", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("Draft safety signals");
    expect(container.textContent).toContain("Citation verification required before launch");
  });

  // ─── D) Success — table rendering ───
  test("success state renders correct number of table rows", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  test("food name is rendered as link with capitalize class", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const link = container.querySelector("a[href='/foods/f1']");
    expect(link).not.toBeNull();
    expect(link!.classList.contains("capitalize")).toBe(true);
    expect(link!.textContent).toBe("trans fat");
  });

  test("category text is rendered", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("Additive");
    expect(container.textContent).toContain("Dairy");
  });

  test("reason text is rendered", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("Increases cardiovascular disease risk");
    expect(container.textContent).toContain("Risk of bacterial contamination including E. coli and Salmonella");
  });

  test("shows 'Conditional' badge for conditionally safe entries", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("Conditional");
    const conditionalBadge = container.querySelector(".bg-yellow-100");
    expect(conditionalBadge).not.toBeNull();
  });

  test("shows 'Absolute' badge for non-conditional entries", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("Absolute");
    const absoluteBadges = container.querySelectorAll(".bg-red-100");
    expect(absoluteBadges.length).toBeGreaterThanOrEqual(1);
  });

  test("formats lethal dose decimal string when present", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    expect(container.textContent).toContain("500 mg");
  });

  test("shows '—' for null lethal_dose", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    // There should be multiple em-dashes for null values
    const emDashes = container.querySelectorAll(".text-gray-300");
    expect(emDashes.length).toBeGreaterThanOrEqual(2);
  });

  test("shows 'Unknown food' in italic for entries with null food", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const unknownFood = container.querySelector(".italic.text-gray-400");
    expect(unknownFood).not.toBeNull();
    expect(unknownFood!.textContent).toBe("Unknown food");
  });

  test("health index badge shows correct color for low value (red)", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    // Find the badge with text "10" and verify it has red classes
    const allBadges = container.querySelectorAll(".bg-red-100, .bg-yellow-100, .bg-green-100");
    const healthBadge = Array.from(allBadges).find((badge) => badge.textContent === "10");
    expect(healthBadge).not.toBeNull();
    expect(healthBadge!.classList.contains("bg-red-100")).toBe(true);
    expect(healthBadge!.classList.contains("text-red-700")).toBe(true);
  });

  test("health index badge shows correct color for moderate value (yellow)", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const yellowBadge = container.querySelector(".bg-yellow-100.text-yellow-700");
    expect(yellowBadge).not.toBeNull();
    expect(yellowBadge!.textContent).toContain("65");
  });

  test("shows '—' for null health_index", () => {
    const entriesWithNullHealth = [
      {
        id: "4",
        food: { id: "f4", name: "unknown health food", category: "Test", health_index: null },
        reason: "Test reason",
        lethal_dose_mg: null,
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: entriesWithNullHealth,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const healthCell = container.querySelector("tbody tr td:nth-child(3)");
    expect(healthCell).not.toBeNull();
    expect(healthCell!.textContent).toContain("—");
  });

  test("does not render non-finite health index values", () => {
    mockUseBanList.mockReturnValue({
      data: [
        {
          id: "5",
          food: { id: "f5", name: "invalid health food", category: "Test", health_index: NaN },
          reason: "Test reason",
          lethal_dose_mg: null,
          is_conditionally_safe: false,
          safe_condition: "",
          regulatory_status: {},
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const healthCell = container.querySelector("tbody tr td:nth-child(3)");
    expect(healthCell).not.toBeNull();
    expect(healthCell!.textContent).toContain("—");
    expect(document.body.textContent).not.toContain("NaN");
  });

  test("clamps out-of-range health index values for display", () => {
    mockUseBanList.mockReturnValue({
      data: [
        {
          id: "6",
          food: { id: "f6", name: "high health food", category: "Test", health_index: 150 },
          reason: "Test reason",
          lethal_dose_mg: null,
          is_conditionally_safe: false,
          safe_condition: "",
          regulatory_status: {},
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const healthBadge = container.querySelector("tbody tr td:nth-child(3) span");
    expect(healthBadge).not.toBeNull();
    expect(healthBadge!.textContent).toContain("100");
    expect(healthBadge!.classList.contains("bg-green-100")).toBe(true);
  });

  // ─── E) Sorting ───
  test("clicking Food header toggles sort to descending", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const foodHeader = container.querySelector("th button");
    expect(foodHeader).not.toBeNull();

    // Default is already asc (↑), clicking toggles to desc (↓)
    fireEvent.click(foodHeader!);

    const sortArrow = container.querySelector("th button span:last-child");
    expect(sortArrow).not.toBeNull();
    expect(sortArrow!.textContent).toBe("↓");
  });

  test("clicking Food header twice returns sort to ascending", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const foodHeader = container.querySelector("th button");
    expect(foodHeader).not.toBeNull();

    // Default asc (↑) → click 1: desc (↓) → click 2: asc (↑)
    fireEvent.click(foodHeader!);
    fireEvent.click(foodHeader!);

    const sortArrow = container.querySelector("th button span:last-child");
    expect(sortArrow).not.toBeNull();
    expect(sortArrow!.textContent).toBe("↑");
  });

  test("clicking different column changes sort key", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const buttons = container.querySelectorAll("th button");
    expect(buttons.length).toBe(6);

    // Click on Category header (second column)
    fireEvent.click(buttons[1]);

    const categorySortArrow = buttons[1].querySelector("span:last-child");
    expect(categorySortArrow).not.toBeNull();
    expect(categorySortArrow!.textContent).toBe("↑");

    // Food header should now show inactive arrow
    const foodSortArrow = buttons[0].querySelector("span:last-child");
    expect(foodSortArrow).not.toBeNull();
    expect(foodSortArrow!.textContent).toBe("↕");
  });

  test("lethal dose sort compares decimal strings numerically", () => {
    const lethalDoseEntries = [
      {
        id: "low",
        food: { id: "low-food", name: "low dose", category: "Test", health_index: 10 },
        reason: "Lower value",
        lethal_dose_mg: "2.5000",
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
      {
        id: "high",
        food: { id: "high-food", name: "high dose", category: "Test", health_index: 10 },
        reason: "Higher value",
        lethal_dose_mg: "10.0000",
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: lethalDoseEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);
    const lethalDoseHeader = container.querySelectorAll("th button")[4];

    fireEvent.click(lethalDoseHeader);

    const rows = Array.from(container.querySelectorAll("tbody tr"));
    expect(rows[0].textContent).toContain("low dose");
    expect(rows[1].textContent).toContain("high dose");
  });

  // ─── F) Null/undefined guard ───
  test("null entries array does not crash", () => {
    mockUseBanList.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    // Should render empty state
    expect(container.textContent).toContain("No ban list entries found.");
  });

  test("entry with missing food fields doesn't crash", () => {
    const incompleteEntries = [
      {
        id: "5",
        food: { id: "f5", name: "incomplete", category: null, health_index: null },
        reason: "Test",
        lethal_dose_mg: null,
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: incompleteEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    // Should still render the row without crashing
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(container.textContent).toContain("incomplete");
  });

  // ─── G) Adversarial ───
  test("XSS in food name renders as text not HTML", () => {
    const xssEntries = [
      {
        id: "xss1",
        food: { id: "fxss", name: "<script>alert('xss')</script>", category: "Test", health_index: 50 },
        reason: "Test",
        lethal_dose_mg: null,
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: xssEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const scriptTag = container.querySelector("script");
    expect(scriptTag).toBeNull();

    // The text should be present but as plain text
    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });

  test("XSS in reason renders as text not HTML", () => {
    const xssEntries = [
      {
        id: "xss2",
        food: { id: "fxss2", name: "safe food", category: "Test", health_index: 50 },
        reason: "<img src=x onerror=alert('xss')>",
        lethal_dose_mg: null,
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: xssEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const imgTag = container.querySelector("img");
    expect(imgTag).toBeNull();

    // The text should be present but as plain text
    expect(container.textContent).toContain("<img src=x onerror=alert('xss')>");
  });

  // ─── H) Retry functionality ───
  test("clicking Retry button calls refetch", () => {
    mockUseBanList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    const { getByText } = renderWithRouter(<BanList />);

    const retryBtn = getByText("Retry");
    fireEvent.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // ─── I) Health index color: green for >= 75 ───
  test("health index badge shows green color for high value (>= 75)", () => {
    const highHealthEntries = [
      {
        id: "6",
        food: { id: "f6", name: "superfood", category: "Health", health_index: 85 },
        reason: "Very healthy",
        lethal_dose_mg: null,
        is_conditionally_safe: false,
        safe_condition: "",
        regulatory_status: {},
      },
    ];

    mockUseBanList.mockReturnValue({
      data: highHealthEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const greenBadge = container.querySelector(".bg-green-100.text-green-700");
    expect(greenBadge).not.toBeNull();
    expect(greenBadge!.textContent).toContain("85");
  });

  // ─── J) Safe condition info icon ───
  test("conditionally safe entry with safe_condition shows info icon and title", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const conditionalRow = Array.from(container.querySelectorAll("tbody tr")).find(
      (row) => row.textContent!.includes("Conditional")
    );
    expect(conditionalRow).not.toBeNull();

    // safe_condition is in the title attribute, not text content
    const conditionalBadge = conditionalRow!.querySelector("span[title='Limit to < 2g per day']");
    expect(conditionalBadge).not.toBeNull();

    // Info icon (ⓘ) should be present
    expect(conditionalRow!.textContent).toContain("\u24D8");
  });

  // ─── K) Default sort ───
  test("default sort is by food_name ascending", () => {
    mockUseBanList.mockReturnValue({
      data: mockEntries,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = renderWithRouter(<BanList />);

    const foodHeader = container.querySelector("th button");
    expect(foodHeader).not.toBeNull();

    const sortArrow = foodHeader!.querySelector("span:last-child");
    expect(sortArrow).not.toBeNull();
    expect(sortArrow!.textContent).toBe("↑");
  });
});
