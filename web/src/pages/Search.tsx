import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useApi";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isLoading, error } = useSearch(debouncedQ);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <input
        type="text"
        defaultValue={q}
        placeholder="Search foods, molecules, ingredients..."
        className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-nutrii-green"
        onChange={(e) => {
          const value = e.target.value;
          if (value) setParams({ q: value });
          else setParams({});
        }}
      />

      {isLoading && debouncedQ.length > 0 && (
        <p className="text-gray-500">Searching...</p>
      )}

      {error && (
        <p className="text-red-500">
          Error: {error instanceof Error ? error.message : "Search failed"}
        </p>
      )}

      {data?.foods && data.foods.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Foods</h2>
          <div className="grid gap-2">
            {data.foods.map((f) => (
              <Link
                key={f.id}
                to={`/foods/${f.id}`}
                className="block p-3 rounded-lg border bg-white hover:shadow transition"
              >
                <span className="font-medium capitalize">{f.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data?.molecules && data.molecules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Molecules</h2>
          <div className="grid gap-2">
            {data.molecules.map((m) => (
              <div key={m.id} className="p-3 rounded-lg border bg-white">
                <span className="font-medium">{m.name}</span>
                {m.molecular_formula && (
                  <span className="text-sm text-gray-500 ml-2">{m.molecular_formula}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
