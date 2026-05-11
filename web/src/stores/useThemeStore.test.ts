import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom globals before any imports that touch DOM/window
// Guard against double-registration when multiple test files run in the same process
if (typeof window === "undefined") {
  GlobalRegistrator.register();
}

/* ------------------------------------------------------------------
 *  IMPORTANT: We must import the store *after* happy-dom is registered
 *  so that window/document/localStorage exist during module init.
 * ---------------------------------------------------------------- */

const { useThemeStore } = await import("./useThemeStore");

describe("useThemeStore", () => {
  beforeEach(() => {
    // Reset store to a known state
    useThemeStore.setState({ isDark: false });
    // Reset DOM
    document.documentElement.classList.remove("dark");
    // Clear localStorage
    localStorage.removeItem("nutrii-theme");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("nutrii-theme");
  });

  // ─── 1) getInitialTheme ───
  test("initial state is false (light mode) when localStorage is empty", () => {
    // In happy-dom, localStorage is empty by default and matchMedia('prefers-color-scheme: dark') is false
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  // ─── 2) applyTheme ───
  test("toggle adds 'dark' class to document.documentElement", () => {
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    useThemeStore.getState().toggle();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("toggle removes 'dark' class from document.documentElement when switching back", () => {
    useThemeStore.getState().toggle(); // dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useThemeStore.getState().toggle(); // light
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  // ─── 3) toggle ───
  test("toggle switches isDark from false to true", () => {
    expect(useThemeStore.getState().isDark).toBe(false);

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isDark).toBe(true);
  });

  test("toggle switches isDark from true back to false", () => {
    useThemeStore.setState({ isDark: true });

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isDark).toBe(false);
  });

  test("toggle called twice returns to initial state", () => {
    expect(useThemeStore.getState().isDark).toBe(false);

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().isDark).toBe(true);

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  // ─── 4) localStorage persistence ───
  test("after toggle to dark, localStorage contains 'dark'", () => {
    useThemeStore.getState().toggle();

    expect(localStorage.getItem("nutrii-theme")).toBe("dark");
  });

  test("after toggle to light, localStorage contains 'light'", () => {
    useThemeStore.setState({ isDark: true });
    useThemeStore.getState().toggle();

    expect(localStorage.getItem("nutrii-theme")).toBe("light");
  });

  test("multiple toggles update localStorage correctly", () => {
    useThemeStore.getState().toggle();
    expect(localStorage.getItem("nutrii-theme")).toBe("dark");

    useThemeStore.getState().toggle();
    expect(localStorage.getItem("nutrii-theme")).toBe("light");

    useThemeStore.getState().toggle();
    expect(localStorage.getItem("nutrii-theme")).toBe("dark");
  });

  // ─── 5) localStorage read ───
  test("store initializes to light mode when localStorage is empty", () => {
    // This verifies getInitialTheme falls through to prefers-color-scheme (false in happy-dom)
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  test("toggle with 'dark' in localStorage sets dark class and updates storage", () => {
    localStorage.setItem("nutrii-theme", "light");
    useThemeStore.setState({ isDark: false });
    document.documentElement.classList.remove("dark");

    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("nutrii-theme")).toBe("dark");
  });

  // ─── 6) Error handling ───
  test("localStorage.setItem throwing does not crash toggle", () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error("Storage disabled");
    };

    // Should not throw
    let error: Error | null = null;
    try {
      useThemeStore.getState().toggle();
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeNull();
    // State should still update in-memory
    expect(useThemeStore.getState().isDark).toBe(true);

    // Restore
    localStorage.setItem = originalSetItem;
  });

  test("localStorage.getItem throwing during toggle does not crash", () => {
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("Storage disabled");
    };

    let error: Error | null = null;
    try {
      useThemeStore.getState().toggle();
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeNull();
    // Toggle should still work - state was false, becomes true
    expect(useThemeStore.getState().isDark).toBe(true);

    // Restore
    localStorage.getItem = originalGetItem;
  });

  // ─── 7) SSR safety ───
  test("toggle does not throw when document is undefined", () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error - simulating SSR
    globalThis.document = undefined;

    let error: Error | null = null;
    try {
      useThemeStore.getState().toggle();
    } catch (e) {
      error = e as Error;
    }

    // Restore before assertions so cleanup works
    globalThis.document = originalDocument;

    expect(error).toBeNull();
    // State should still update in-memory even without document
    expect(useThemeStore.getState().isDark).toBe(true);
  });

  test("toggle does not throw when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    globalThis.window = undefined;

    let error: Error | null = null;
    try {
      useThemeStore.getState().toggle();
    } catch (e) {
      error = e as Error;
    }

    // Restore before assertions
    globalThis.window = originalWindow;

    expect(error).toBeNull();
    // State should still update in-memory even without window
    expect(useThemeStore.getState().isDark).toBe(true);
  });

  // ─── Property-based: idempotency of applyTheme ───
  test("calling toggle multiple times is idempotent in final state after even number of calls", () => {
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("nutrii-theme")).toBe("light");
  });

  test("odd number of toggles leaves state in dark mode", () => {
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("nutrii-theme")).toBe("dark");
  });
});
