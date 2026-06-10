import { Link, useSearchParams } from "react-router-dom";
import { useCompare } from "../hooks/useApi";
import { formatCount, moleculeAmountEntries, sharedMoleculeNames } from "../lib/compareDisplay";
import { formatScore, normalizeScore } from "../lib/scoreDisplay";

function getHealthBarColor(healthIndex: number): string {
  if (healthIndex >= 75) return "bg-green-500";
  if (healthIndex >= 50) return "bg-yellow-500";
  if (healthIndex >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function foodCardKey(food: { id?: string; name?: string }, index: number) {
  return food.id || `${food.name || "food"}-${index}`;
}

export default function Compare() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
  const isValid = ids.length >= 2 && ids.length <= 3;

  const { data, isLoading, error, refetch } = useCompare(ids);

  if (!isValid) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Compare requires 2–3 foods</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The compare feature needs 2 or 3 food IDs to work. Please include 2–3 food identifiers in the URL.
        </p>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline">
          Back to Home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(ids.length)].map((_, n) => (
            <div key={n} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4 animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
              <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Failed to load comparison data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          The comparison data could not be loaded. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline mr-4"
        >
          Retry
        </button>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!data) return null;

  if (data.foods.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">No comparison data available</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The comparison returned no results. The provided IDs may not correspond to existing foods.
        </p>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const foodCount = data.foods.length;
  const sharedMolecules = sharedMoleculeNames(data.shared_molecules);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Compare {foodCount} Foods</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.foods.map((food, index) => {
          const healthIndex = normalizeScore(food.health_index);
          const healthBarValue = healthIndex ?? 0;
          const moleculeEntries = moleculeAmountEntries(food.molecules);

          return (
            <div key={foodCardKey(food, index)} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4">
              <Link
                to={`/foods/${food.id || ""}`}
                className="text-xl font-bold capitalize text-blue-600 dark:text-blue-400 hover:underline block"
              >
                {food.name}
              </Link>

              <div>
                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-4 w-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getHealthBarColor(healthBarValue)}`}
                    style={{ width: `${healthBarValue}%` }}
                    role="progressbar"
                    aria-valuenow={healthBarValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {healthIndex ?? "unknown"}/100 — Safety Score: {formatScore(food.safety_score)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Molecules
                </h3>
                {moleculeEntries.length > 0 ? (
                  <div className="space-y-1">
                    {moleculeEntries.map(([moleculeName, amount]) => (
                      <div
                        key={moleculeName}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{moleculeName}</span>
                        <span className="text-gray-500 dark:text-gray-400">{amount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-400 dark:text-gray-500">
                    No molecules data available
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sharedMolecules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold mb-3">Shared Molecules</h2>
          <div className="flex flex-wrap gap-2">
            {sharedMolecules.map((moleculeName) => (
              <span
                key={moleculeName}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm px-3 py-1 rounded-full"
              >
                {moleculeName}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Unique molecules: {formatCount(data.total_unique_molecules)}
      </p>
    </div>
  );
}
