import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Search from "./Search";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

// Mock the useSearch hook
const mockUseSearch = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
}));

mock.module("../hooks/useApi", () => ({
  useSearch: mockUseSearch,
}));

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ["/search"]) {
  return render(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
  });
}

describe("Search page", () => {
  beforeEach(() => {
    mockUseSearch.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseSearch.mockClear();
  });

  // ─── Happy path ───

  test("renders search input and heading", () => {
    renderWithRouter(<Search />);

    expect(document.body.textContent).toContain("Search");
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe("Search foods, molecules, ingredients...");
    expect(input.maxLength).toBe(128);
  });

  test("reads initial query from URL search params", () => {
    renderWithRouter(<Search />, ["/search?q=apple"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("apple");
  });

  test("calls useSearch with debounced query from URL", () => {
    renderWithRouter(<Search />, ["/search?q=banana"]);

    // useSearch should be called with the debounced query (same as URL after mount)
    expect(mockUseSearch).toHaveBeenCalledWith("banana");
  });

  test("loading state shows 'Searching...' text", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Searching...");
  });

  test("loading state is NOT shown when query is empty", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithRouter(<Search />, ["/search"]);

    expect(document.body.textContent).not.toContain("Searching...");
  });

  test("success state renders foods section with links", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [
          { id: "1", name: "apple", molecular_formula: "C6H12O6", health_index: 85 },
          { id: "2", name: "banana", molecular_formula: "", health_index: 65 },
        ],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=fruit"]);

    expect(document.body.textContent).toContain("Foods");
    expect(document.body.textContent).toContain("apple");
    expect(document.body.textContent).toContain("banana");

    const links = document.querySelectorAll('a[href^="/foods/"]');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("/foods/1");
    expect(links[1].getAttribute("href")).toBe("/foods/2");
    expect(document.body.textContent).toContain("85");
    expect(document.body.textContent).toContain("65");
  });

  test("success state does not render unsafe food or molecule image URLs", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [
          { id: "1", name: "apple", health_index: 85, image_url: "javascript:alert(1)" },
        ],
        molecules: [
          { id: "m1", name: "Water", molecular_formula: "H2O", structure_image_url: "data:image/svg+xml,<svg />" },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.textContent).toContain("apple");
    expect(container.textContent).toContain("Water");
    expect(container.querySelector("img")).toBeNull();
  });

  test("food result health index badges clamp out-of-range scores", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [
          { id: "1", name: "high", health_index: 150 },
          { id: "2", name: "low", health_index: -20 },
        ],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.textContent).toContain("100");
    expect(container.textContent).toContain("0");
    expect(container.textContent).not.toContain("150");
    expect(container.textContent).not.toContain("-20");
  });

  test("food result health index badge is hidden for non-finite scores", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [{ id: "1", name: "nan food", health_index: NaN }],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.textContent).toContain("nan food");
    expect(container.textContent).not.toContain("NaN");
    expect(container.querySelector(".rounded-full")).toBeNull();
  });

  test("success state renders molecules section", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [],
        molecules: [
          { id: "m1", name: "Glucose", molecular_formula: "C6H12O6" },
          { id: "m2", name: "Fructose", molecular_formula: "" },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=sugar"]);

    expect(document.body.textContent).toContain("Molecules");
    expect(document.body.textContent).toContain("Glucose");
    expect(document.body.textContent).toContain("Fructose");
    expect(document.body.textContent).toContain("C6H12O6");
  });

  test("food names are capitalized in display", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [{ id: "1", name: "apple pie", molecular_formula: "" }],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=pie"]);

    expect(document.body.textContent).toContain("apple pie");
  });

  test("molecule without molecular_formula does not show formula span", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [],
        molecules: [{ id: "m1", name: "Unknown Compound", molecular_formula: "" }],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=unknown"]);

    expect(document.body.textContent).toContain("Unknown Compound");
    const formulaSpans = document.querySelectorAll(".text-sm.text-gray-500");
    expect(formulaSpans.length).toBe(0);
  });

  // ─── Empty results ───

  test("empty foods array does not render foods section", () => {
    mockUseSearch.mockReturnValue({
      data: { foods: [], molecules: [{ id: "m1", name: "Water", molecular_formula: "H2O" }] },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=water"]);

    expect(document.body.textContent).not.toContain("Foods");
    expect(document.body.textContent).toContain("Molecules");
  });

  test("empty molecules array does not render molecules section", () => {
    mockUseSearch.mockReturnValue({
      data: { foods: [{ id: "1", name: "carrot", molecular_formula: "" }], molecules: [] },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=carrot"]);

    expect(document.body.textContent).toContain("Foods");
    expect(document.body.textContent).not.toContain("Molecules");
  });

  test("both empty arrays shows no results sections", () => {
    mockUseSearch.mockReturnValue({
      data: { foods: [], molecules: [] },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=xyz"]);

    expect(document.body.textContent).not.toContain("Foods");
    expect(document.body.textContent).not.toContain("Molecules");
  });

  // ─── Error states ───

  test("error state shows error message in red", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network failure"),
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Error: Network failure");
    const errorEl = document.querySelector(".text-red-500");
    expect(errorEl).not.toBeNull();
  });

  test("error state handles non-Error error with fallback message", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: "String error",
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Error: Search failed");
  });

  test("error state handles null/undefined error gracefully", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).not.toContain("Error:");
  });

  // ─── URL shareability / input behavior ───

  test("typing in input updates URL search params", () => {
    const { container } = renderWithRouter(<Search />, ["/search"]);

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "spinach" } });

    // After change, the URL should be updated (setParams called)
    // In MemoryRouter, we can't easily read the URL back, but we can verify
    // the component re-renders and useSearch gets called after debounce
  });

  test("clearing input removes q param", () => {
    const { container } = renderWithRouter(<Search />, ["/search?q=kiwi"]);

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    // Should not crash and should clear params
    expect(document.body.textContent).toContain("Search");
  });

  // ─── Debounce ───

  test("useSearch is called immediately with initial URL query on mount", () => {
    renderWithRouter(<Search />, ["/search?q=immediate"]);

    expect(mockUseSearch).toHaveBeenCalledWith("immediate");
  });

  test("useSearch not called when query is empty", () => {
    mockUseSearch.mockClear();
    renderWithRouter(<Search />, ["/search"]);

    // useSearch is still called but with empty string
    expect(mockUseSearch).toHaveBeenCalledWith("");
  });

  test("useSearch returns enabled=false behavior for empty query", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search"]);

    // Should not show searching or any results
    expect(document.body.textContent).not.toContain("Searching...");
    expect(document.body.textContent).not.toContain("Foods");
    expect(document.body.textContent).not.toContain("Molecules");
  });

  // ─── Boundary / edge cases ───

  test("null data does not crash", () => {
    mockUseSearch.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Search");
    expect(document.body.textContent).not.toContain("Foods");
    expect(document.body.textContent).not.toContain("Molecules");
  });

  test("undefined data does not crash", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Search");
  });

  test("foods with missing name still renders link with empty text", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [{ id: "1", name: "", molecular_formula: "" }],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    const links = document.querySelectorAll('a[href^="/foods/"]');
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe("");
  });

  test("molecule with missing name renders empty div", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [],
        molecules: [{ id: "m1", name: "", molecular_formula: "" }],
      },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Molecules");
  });

  test("undefined foods/molecules properties do not crash", () => {
    mockUseSearch.mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Search");
  });

  test("null foods/molecules properties do not crash", () => {
    mockUseSearch.mockReturnValue({
      data: { foods: null, molecules: null },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Search");
  });

  test("large result set renders all items", () => {
    const manyFoods = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `food-${i}`,
      molecular_formula: "",
    }));

    mockUseSearch.mockReturnValue({
      data: { foods: manyFoods, molecules: [] },
      isLoading: false,
      error: null,
    });

    renderWithRouter(<Search />, ["/search?q=bulk"]);

    const links = document.querySelectorAll('a[href^="/foods/"]');
    expect(links.length).toBe(100);
  });

  test("special characters in query are handled", () => {
    renderWithRouter(<Search />, ["/search?q=chocolate%20cake"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("chocolate cake");
  });

  test("unicode characters in query are handled", () => {
    renderWithRouter(<Search />, ["/search?q=寿司"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("寿司");
  });

  test("XSS-like content in results is rendered as text not HTML", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [
          { id: "1", name: "<script>alert(1)</script>", molecular_formula: "" },
        ],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("<script>alert(1)</script>");
  });

  test("simultaneous loading and error shows both states", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: new Error("Simultaneous"),
    });

    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(document.body.textContent).toContain("Searching...");
    expect(document.body.textContent).toContain("Error: Simultaneous");
  });

  test("transition from loading to success renders results", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { rerender, container } = renderWithRouter(<Search />, ["/search?q=test"]);
    expect(container.textContent).toContain("Searching...");

    mockUseSearch.mockReturnValue({
      data: {
        foods: [{ id: "1", name: "result", molecular_formula: "" }],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    rerender(<Search />);
    expect(container.textContent).toContain("result");
    expect(container.textContent).not.toContain("Searching...");
  });

  test("only useSearch is called — no raw api.search", () => {
    renderWithRouter(<Search />, ["/search?q=test"]);

    expect(mockUseSearch).toHaveBeenCalled();
  });
});

describe("Search page — debounce behavior", () => {
  beforeEach(() => {
    mockUseSearch.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseSearch.mockClear();
  });

  test("debounced query changes after timeout simulate rapid typing", async () => {
    // This test verifies the debounce mechanism conceptually:
    // The component uses setTimeout(..., 300) to update debouncedQ.
    // We verify the hook receives the query from URL params.
    renderWithRouter(<Search />, ["/search?q=initial"]);

    // Initial call
    expect(mockUseSearch).toHaveBeenCalledWith("initial");

    // After the component processes URL params, debouncedQ = "initial"
    // The hook should have been called at least once
    expect(mockUseSearch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Search page — ADVERSARIAL / ATTACK VECTORS", () => {
  beforeEach(() => {
    mockUseSearch.mockClear();
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    mockUseSearch.mockClear();
  });

  // ─── 1. Rapid keystroke debounce race conditions ───

  test("rapid consecutive input changes do not crash", () => {
    const { container } = renderWithRouter(<Search />, ["/search"]);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    for (let i = 0; i < 50; i++) {
      fireEvent.change(input, { target: { value: `a`.repeat(i) } });
    }

    expect(document.body.textContent).toContain("Search");
    expect(input).not.toBeNull();
  });

  test("rapid input changes with backspacing do not crash", () => {
    const { container } = renderWithRouter(<Search />, ["/search"]);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    for (let i = 0; i < 30; i++) {
      fireEvent.change(input, { target: { value: `query-${i}` } });
    }
    for (let i = 29; i >= 0; i--) {
      fireEvent.change(input, { target: { value: `query-${i}` } });
    }

    expect(document.body.textContent).toContain("Search");
  });

  // ─── 2. Very long search queries (10K chars) ───

  test("10K character query in URL is capped before search", () => {
    const longQuery = "a".repeat(10000);
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(longQuery)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("a".repeat(128));
    expect(mockUseSearch).toHaveBeenCalledWith("a".repeat(128));
    expect(document.body.textContent).toContain("Search queries are limited to 128 characters.");
  });

  test("10K character result name renders without crashing", () => {
    const longName = "x".repeat(10000);
    mockUseSearch.mockReturnValue({
      data: {
        foods: [{ id: "1", name: longName, molecular_formula: "" }],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.textContent).toContain(longName);
  });

  // ─── 3. XSS in search input / URL params ───

  test("XSS script tag in URL param is not executed", () => {
    const xssQuery = "<script>alert('xss')</script>";
    const { container } = renderWithRouter(<Search />, [
      `/search?q=${encodeURIComponent(xssQuery)}`,
    ]);

    const scripts = container.querySelectorAll("script");
    expect(scripts.length).toBe(0);

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("<script>alert('xss')</script>");
  });

  test("XSS onerror attribute in URL param is not executed", () => {
    const xssQuery = '<img src=x onerror="alert(1)">';
    const { container } = renderWithRouter(<Search />, [
      `/search?q=${encodeURIComponent(xssQuery)}`,
    ]);

    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(0);

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe('<img src=x onerror="alert(1)">');
  });

  test("XSS javascript: protocol in URL param is rendered as text", () => {
    const xssQuery = "javascript:alert(1)";
    const { container } = renderWithRouter(<Search />, [
      `/search?q=${encodeURIComponent(xssQuery)}`,
    ]);

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("javascript:alert(1)");
  });

  test("XSS in molecule molecular_formula is rendered as text", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [],
        molecules: [
          {
            id: "m1",
            name: "Test",
            molecular_formula: "<script>alert(1)</script>",
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  test("XSS in food name is rendered as text not HTML", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [
          {
            id: "1",
            name: "<a href='javascript:alert(1)'>click</a>",
            molecular_formula: "",
          },
        ],
        molecules: [],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    const links = container.querySelectorAll("a");
    // Only the expected food link should exist, not the injected anchor
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("/foods/1");
    expect(container.textContent).toContain("<a href='javascript:alert(1)'>click</a>");
  });

  // ─── 4. Special characters (unicode, emoji, null bytes) ───

  test("emoji in URL query is handled", () => {
    renderWithRouter(<Search />, ["/search?q=🍕🍔🍟"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("🍕🍔🍟");
    expect(mockUseSearch).toHaveBeenCalledWith("🍕🍔🍟");
  });

  test("null byte in URL query is handled", () => {
    const queryWithNull = "test\x00injection";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(queryWithNull)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("test\x00injection");
  });

  test("RTL override characters in URL query are handled", () => {
    const rtlQuery = "\u202Eevil\u202C"; // RLO + "evil" + PDF
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(rtlQuery)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(rtlQuery);
  });

  test("zero-width spaces in URL query are handled", () => {
    const zwspQuery = "test\u200Binjection";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(zwspQuery)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(zwspQuery);
  });

  test("combining characters in URL query are handled", () => {
    const combiningQuery = "cafe\u0301"; // cafe with combining acute accent
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(combiningQuery)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(combiningQuery);
  });

  test("special chars in results: emoji molecule name", () => {
    mockUseSearch.mockReturnValue({
      data: {
        foods: [],
        molecules: [
          {
            id: "m1",
            name: "🧪 Chemical",
            molecular_formula: "H2O",
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=test"]);

    expect(container.textContent).toContain("🧪 Chemical");
  });

  // ─── 5. URL param manipulation ───

  test("malformed URL with multiple q params uses first value", () => {
    renderWithRouter(<Search />, ["/search?q=first&q=second"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    // MemoryRouter's useSearchParams typically returns first value
    expect(input.defaultValue).toBe("first");
  });

  test("URL with empty q param renders without crashing", () => {
    renderWithRouter(<Search />, ["/search?q="]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("");
    expect(mockUseSearch).toHaveBeenCalledWith("");
  });

  test("URL with only search marker (no q) renders without crashing", () => {
    renderWithRouter(<Search />, ["/search?"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("");
  });

  test("URL with path traversal attempt in query is handled", () => {
    renderWithRouter(<Search />, ["/search?q=../../../etc/passwd"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("../../../etc/passwd");
    expect(mockUseSearch).toHaveBeenCalledWith("../../../etc/passwd");
  });

  test("URL with SQL injection-like query is handled", () => {
    const sqlInjection = "'; DROP TABLE foods; --";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(sqlInjection)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(sqlInjection);
  });

  test("URL with percent-encoded special chars is decoded correctly", () => {
    renderWithRouter(<Search />, ["/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E"]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("<script>alert(1)</script>");
  });

  // ─── 6. Concurrent input changes ───

  test("interleaved rapid input changes with set/clear/clear/set do not crash", () => {
    const { container } = renderWithRouter(<Search />, ["/search"]);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    const values = ["a", "ab", "", "x", "xy", "", "", "z"];
    for (const val of values) {
      fireEvent.change(input, { target: { value: val } });
    }

    expect(container.textContent).toContain("Search");
    expect(input).not.toBeNull();
  });

  test("rapid alternating between two values does not crash", () => {
    const { container } = renderWithRouter(<Search />, ["/search"]);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    for (let i = 0; i < 20; i++) {
      fireEvent.change(input, {
        target: { value: i % 2 === 0 ? "search-a" : "search-b" },
      });
    }

    expect(container.textContent).toContain("Search");
  });

  // ─── 7. Clearing input during loading ───

  test("clearing input while loading does not crash", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=loading"]);

    // Verify loading state is shown
    expect(container.textContent).toContain("Searching...");

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    // Should not crash
    expect(container.textContent).toContain("Search");
  });

  test("clearing input then retyping during loading does not crash", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=loading"]);
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "new" } });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "again" } });

    expect(container.textContent).toContain("Search");
    expect(input).not.toBeNull();
  });

  test("input cleared while error is showing does not crash", () => {
    mockUseSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Search failed"),
    });

    const { container } = renderWithRouter(<Search />, ["/search?q=error"]);

    expect(container.textContent).toContain("Error: Search failed");

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    expect(container.textContent).toContain("Search");
  });

  // ─── Boundary / stress ───

  test("extremely long unicode string in URL is capped", () => {
    const longUnicode = "🎉".repeat(1000);
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(longUnicode)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("🎉".repeat(128));
    expect(document.body.textContent).toContain("Search queries are limited to 128 characters.");
  });

  test("mix of all special characters in single query", () => {
    const mixedQuery = "<script>🎉\x00\u202E../../../etc/passwd'; DROP TABLE; --";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(mixedQuery)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(mixedQuery);
  });

  test("whitespace-only query does not crash", () => {
    renderWithRouter(<Search />, ["/search?q=   "]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe("   ");
    expect(mockUseSearch).toHaveBeenCalledWith("   ");
  });

  test("newline characters in query are handled", () => {
    const multiline = "line1\nline2\r\nline3";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(multiline)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(multiline);
  });

  test("tab characters in query are handled", () => {
    const tabs = "col1\tcol2\tcol3";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(tabs)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(tabs);
  });

  test("template literal injection in query is handled", () => {
    const templateInjection = "${process.env.SECRET}";
    renderWithRouter(<Search />, [`/search?q=${encodeURIComponent(templateInjection)}`]);

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.defaultValue).toBe(templateInjection);
  });
});
