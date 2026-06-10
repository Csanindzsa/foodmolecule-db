import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../hooks/useApi";
import { validRouteId } from "../lib/routeId";
import { externalHttpUrl } from "../lib/safeUrl";
import { normalizeScore, scoreBadgeClass } from "../lib/scoreDisplay";
import { formatOptionalText } from "../lib/textDisplay";

const MAX_SEARCH_QUERY_CHARS = 128;

function limitSearchQuery(value: string) {
  return Array.from(value).slice(0, MAX_SEARCH_QUERY_CHARS).join("");
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const rawQ = params.get("q") || "";
  const q = limitSearchQuery(rawQ);
  const queryWasTruncated = Array.from(rawQ).length > MAX_SEARCH_QUERY_CHARS;
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
        maxLength={MAX_SEARCH_QUERY_CHARS}
        placeholder="Search foods, molecules, ingredients..."
        className="w-full px-4 py-3 rounded-lg border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-nutrii-green"
        onChange={(e) => {
          const value = limitSearchQuery(e.target.value);
          if (value) setParams({ q: value });
          else setParams({});
        }}
      />

      {queryWasTruncated && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Search queries are limited to {MAX_SEARCH_QUERY_CHARS} characters.
        </p>
      )}

      {isLoading && debouncedQ.length > 0 && (
        <p className="text-gray-500 dark:text-gray-400">Searching...</p>
      )}

      {error && (
        <p className="text-red-500 dark:text-red-400">
          Error: {error instanceof Error ? error.message : "Search failed"}
        </p>
      )}

      {data?.foods && data.foods.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Foods</h2>
          <div className="grid gap-2">
            {data.foods.map((f) => {
              const healthIndex = normalizeScore(f.health_index);
              const imageUrl = externalHttpUrl(f.image_url);
              const foodId = validRouteId(f.id);
              const resultClass = "flex items-center gap-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow transition";
              const resultContent = (
                <>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Food photo: ${f.name}`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1 font-medium capitalize">{f.name}</span>
                  {healthIndex !== null && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${scoreBadgeClass(healthIndex)}`}>
                      {healthIndex}
                    </span>
                  )}
                </>
              );

              return foodId ? (
                <Link
                  key={f.id}
                  to={`/foods/${foodId}`}
                  className={resultClass}
                >
                  {resultContent}
                </Link>
              ) : (
                <div key={f.id || f.name} className={resultClass}>
                  {resultContent}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data?.molecules && data.molecules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Molecules</h2>
          <div className="grid gap-2">
            {data.molecules.map((m) => {
              const imageUrl = externalHttpUrl(m.structure_image_url);
              const formula = formatOptionalText(m.molecular_formula);
              const moleculeId = validRouteId(m.id);
              const moleculeClass = "flex items-center gap-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800";
              const moleculeContent = (
                <>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Molecular structure: ${m.name}`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-md bg-white object-contain p-1 dark:bg-gray-900"
                    />
                  )}
                  <div>
                    <span className="font-medium">{m.name}</span>
                    {formula && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{formula}</span>
                    )}
                  </div>
                </>
              );

              return moleculeId ? (
                <Link key={m.id} to={`/molecules/${moleculeId}`} className={`${moleculeClass} hover:shadow transition`}>
                  {moleculeContent}
                </Link>
              ) : (
                <div key={m.id || m.name} className={moleculeClass}>
                  {moleculeContent}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
