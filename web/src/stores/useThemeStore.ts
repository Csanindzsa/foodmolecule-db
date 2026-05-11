import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

function getInitialTheme(): boolean {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("nutrii-theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
    } catch {
      // localStorage unavailable — fall through to prefers-color-scheme
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

function applyTheme(isDark: boolean): void {
  if (typeof document !== "undefined") {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
  try {
    localStorage.setItem("nutrii-theme", isDark ? "dark" : "light");
  } catch {
    // Storage unavailable — theme still works in-memory
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: getInitialTheme(),
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      applyTheme(next);
      return { isDark: next };
    }),
}));

// Initialize on import
applyTheme(getInitialTheme());
