import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-nutrii-green text-white px-6 py-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            nutrii
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/search" className="hover:underline">Search</Link>
            <Link to="/ban-list" className="hover:underline">Ban List</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t px-6 py-6 text-sm text-gray-500">
        <div className="max-w-5xl mx-auto">
          nutrii — Autonomous food safety intelligence. No auth. No paywalls. Science-first.
        </div>
      </footer>
    </div>
  );
}
