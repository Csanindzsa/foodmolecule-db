import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import Research from "./Research";

GlobalRegistrator.register();

const mockRefetch = mock(() => {});

const mockUseRecentStudies = mock(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

mock.module("../hooks/useApi", () => ({
  useRecentStudies: mockUseRecentStudies,
}));

const mockStudies = [
  {
    id: "study-1",
    pmid: "123456",
    title: "Apple polyphenols and metabolic markers",
    authors: ["A. Researcher"],
    journal: "Journal of Food Evidence",
    publication_year: 2026,
    url: "https://pubmed.ncbi.nlm.nih.gov/123456/",
    abstract: "Abstract",
    ai_summary: "Polyphenol intake was associated with improved markers.",
    ai_safety_impact: 1,
    ai_health_impact: 2,
    ai_confidence: "medium",
    ai_model_used: "test-model",
    analyzed_at: "2026-06-01T12:00:00Z",
  },
];

describe("Research page", () => {
  beforeEach(() => {
    mockUseRecentStudies.mockClear();
    mockRefetch.mockClear();
  });

  afterEach(() => {
    cleanup();
    mockUseRecentStudies.mockClear();
    mockRefetch.mockClear();
  });

  test("loading state shows skeleton research cards", () => {
    mockUseRecentStudies.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<Research />);

    expect(container.textContent).toContain("Latest Research");
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  test("error state offers retry", () => {
    mockUseRecentStudies.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    const { getByText } = render(<Research />);

    fireEvent.click(getByText("Retry"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test("empty state explains no analyzed studies were found", () => {
    mockUseRecentStudies.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<Research />);

    expect(container.textContent).toContain("No analyzed research studies found.");
  });

  test("success state renders summaries, PubMed links, and AI context", () => {
    mockUseRecentStudies.mockReturnValue({
      data: mockStudies,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<Research />);

    expect(container.textContent).toContain("Apple polyphenols and metabolic markers");
    expect(container.textContent).toContain("Polyphenol intake was associated");
    expect(container.textContent).toContain("AI confidence: medium");
    expect(container.textContent).toContain("Safety impact: +1");
    expect(container.textContent).toContain("Health impact: +2");

    const link = container.querySelector('a[href="https://pubmed.ncbi.nlm.nih.gov/123456/"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute("target")).toBe("_blank");
    expect(link!.getAttribute("rel")).toBe("noreferrer");
  });

  test("success state does not link unsafe citation URLs", () => {
    mockUseRecentStudies.mockReturnValue({
      data: [{ ...mockStudies[0], url: "javascript:alert(1)" }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<Research />);

    expect(container.textContent).toContain("PMID: 123456");
    expect(container.querySelector("a")).toBeNull();
  });

  test("success state clamps and hides malformed AI impact values", () => {
    mockUseRecentStudies.mockReturnValue({
      data: [
        { ...mockStudies[0], ai_safety_impact: 99, ai_health_impact: Number.NaN },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<Research />);

    expect(container.textContent).toContain("Safety impact: +5");
    expect(container.textContent).not.toContain("Health impact:");
    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("99");
  });
});
