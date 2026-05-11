import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useThemeStore } from "../stores/useThemeStore";

// Register happy-dom globals before any React imports
GlobalRegistrator.register();

/* ------------------------------------------------------------------
 *  Import Layout AFTER happy-dom is ready (Layout imports useThemeStore
 *  which touches document/window at module level)
 * ---------------------------------------------------------------- */

import Layout from "./Layout";

/* ------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------- */

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  );
}

describe("Layout component", () => {
  beforeEach(() => {
    // Reset store to light mode
    useThemeStore.setState({ isDark: false });
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("nutrii-theme");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("nutrii-theme");
  });

  // ─── A) Toggle button ───
  test("renders toggle button with correct aria-label", () => {
    const { container } = renderWithRouter();

    const btn = container.querySelector('button[aria-label="Toggle dark mode"]');
    expect(btn).not.toBeNull();
  });

  test("toggle button is inside the header nav", () => {
    const { container } = renderWithRouter();

    const header = container.querySelector("header");
    expect(header).not.toBeNull();

    const btn = header!.querySelector('button[aria-label="Toggle dark mode"]');
    expect(btn).not.toBeNull();
  });

  test("toggle button has aria-hidden on its SVG icon", () => {
    const { container } = renderWithRouter();

    const btn = container.querySelector('button[aria-label="Toggle dark mode"]');
    expect(btn).not.toBeNull();

    const svg = btn!.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });

  // ─── B) Light mode icon (moon) ───
  test("shows moon icon when isDark is false", () => {
    useThemeStore.setState({ isDark: false });

    const { container } = renderWithRouter();

    const btn = container.querySelector('button[aria-label="Toggle dark mode"]');
    expect(btn).not.toBeNull();

    // Moon SVG has a single path with d containing the moon shape
    const svg = btn!.querySelector("svg");
    expect(svg).not.toBeNull();
    const path = svg!.querySelector("path");
    expect(path).not.toBeNull();
    expect(path!.getAttribute("d")).toContain("21 12.79");
  });

  // ─── C) Dark mode icon (sun) ───
  test("shows sun icon when isDark is true", () => {
    useThemeStore.setState({ isDark: true });

    const { container } = renderWithRouter();

    const btn = container.querySelector('button[aria-label="Toggle dark mode"]');
    expect(btn).not.toBeNull();

    // Sun SVG has a circle element
    const svg = btn!.querySelector("svg");
    expect(svg).not.toBeNull();
    const circle = svg!.querySelector("circle");
    expect(circle).not.toBeNull();
    expect(circle!.getAttribute("cx")).toBe("12");
  });

  // ─── D) Toggle interaction ───
  test("clicking toggle button switches theme state", () => {
    useThemeStore.setState({ isDark: false });

    const { container } = renderWithRouter();

    const btn = container.querySelector('button[aria-label="Toggle dark mode"]')!;
    fireEvent.click(btn);

    expect(useThemeStore.getState().isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  // ─── E) Navigation links ───
  test("renders Home navigation link", () => {
    const { container } = renderWithRouter();

    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();

    const homeLink = nav!.querySelector('a[href="/"]');
    expect(homeLink).not.toBeNull();
    expect(homeLink!.textContent).toContain("Home");
  });

  test("renders Search navigation link", () => {
    const { container } = renderWithRouter();

    const searchLink = container.querySelector('a[href="/search"]');
    expect(searchLink).not.toBeNull();
    expect(searchLink!.textContent).toContain("Search");
  });

  test("renders Ban List navigation link", () => {
    const { container } = renderWithRouter();

    const banListLink = container.querySelector('a[href="/ban-list"]');
    expect(banListLink).not.toBeNull();
    expect(banListLink!.textContent).toContain("Ban List");
  });

  // ─── F) Footer ───
  test("renders footer with site description", () => {
    const { container } = renderWithRouter();

    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toContain("nutrii — Autonomous food safety intelligence");
  });

  test("footer has dark mode border class", () => {
    const { container } = renderWithRouter();

    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer!.classList.contains("dark:border-gray-700")).toBe(true);
  });

  test("footer has dark mode text color class", () => {
    const { container } = renderWithRouter();

    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer!.classList.contains("dark:text-gray-400")).toBe(true);
  });

  // ─── G) Header branding ───
  test("renders 'nutrii' brand link to home", () => {
    const { container } = renderWithRouter();

    const brandLink = container.querySelector('header a[href="/"]');
    expect(brandLink).not.toBeNull();
    expect(brandLink!.textContent).toContain("nutrii");
  });

  // ─── H) Outlet container ───
  test("renders main content area", () => {
    const { container } = renderWithRouter();

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
  });
});
