import { describe, test, expect, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

GlobalRegistrator.register();

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );
}

describe("NotFound page", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders 404 heading", () => {
    renderWithRouter();
    expect(document.body.textContent).toContain("404");
  });

  test("renders Page Not Found message", () => {
    renderWithRouter();
    expect(document.body.textContent).toContain("Page Not Found");
  });

  test("renders description text", () => {
    renderWithRouter();
    expect(document.body.textContent).toContain("The page you're looking for doesn't exist or has been moved.");
  });

  test("renders Back to Home link with correct href", () => {
    renderWithRouter();
    const link = document.querySelector('a[href="/"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Back to Home");
  });

  test("Back to Home link is the only link", () => {
    renderWithRouter();
    const links = document.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("/");
  });
});
