import { Link, Outlet } from "react-router-dom";
import { useState } from "react";
import { useThemeStore } from "../stores/useThemeStore";

export default function Layout() {
  const { isDark, toggle } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-nutrii-green text-white px-6 py-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            nutrii
          </Link>

          {/* Desktop nav (md+) */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/search" className="hover:underline">Search</Link>
            <Link to="/ban-list" className="hover:underline">Ban List</Link>
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </nav>

          {/* Mobile hamburger button (below md) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1 rounded hover:bg-white/20 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 mt-3 pt-3 pb-2 space-y-2">
            <Link
              to="/"
              className="block px-2 py-2 text-sm hover:bg-white/10 rounded"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block px-2 py-2 text-sm hover:bg-white/10 rounded"
              onClick={() => setMenuOpen(false)}
            >
              Search
            </Link>
            <Link
              to="/ban-list"
              className="block px-2 py-2 text-sm hover:bg-white/10 rounded"
              onClick={() => setMenuOpen(false)}
            >
              Ban List
            </Link>
            <div className="px-2 py-2 flex items-center gap-2 text-sm">
              <span>Dark mode</span>
              <button
                onClick={toggle}
                aria-label="Toggle dark mode"
                className="p-1 rounded hover:bg-white/20 transition-colors ml-auto"
              >
                {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t dark:border-gray-700 px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
        <div className="max-w-5xl mx-auto">
          nutrii — Autonomous food safety intelligence. No auth. No paywalls. Science-first.
        </div>
      </footer>
    </div>
  );
}
