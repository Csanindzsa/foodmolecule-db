import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Food, Molecule } from "../lib/api";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [foods, setFoods] = useState<Food[]>([]);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    api.search(q)
      .then((data) => {
        setFoods(data.foods || []);
        setMolecules(data.molecules || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

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

      {loading && <p className="text-gray-500">Searching...</p>}

      {foods.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Foods</h2>
          <div className="grid gap-2">
            {foods.map((f) => (
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

      {molecules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Molecules</h2>
          <div className="grid gap-2">
            {molecules.map((m) => (
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
