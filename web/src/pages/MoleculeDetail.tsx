import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMoleculeDetail, useMoleculeFoods, useMoleculeNeutralizations } from "../hooks/useApi";

export default function MoleculeDetail() {
  const { id } = useParams<{ id: string }>();
  const idStr = id || "";

  const {
    data: molecule,
    isLoading: moleculeLoading,
    error: moleculeError,
  } = useMoleculeDetail(idStr);

  const {
    data: foods,
    isLoading: foodsLoading,
    error: foodsError,
    refetch: refetchFoods,
  } = useMoleculeFoods(idStr);

  const {
    data: neutralizations,
    isLoading: neutralizationsLoading,
    error: neutralizationsError,
    refetch: refetchNeutralizations,
  } = useMoleculeNeutralizations(idStr);

  // --- Overall loading skeleton ---
  if (moleculeLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(n => (
            <div key={n} className="h-16 bg-gray-200 dark:bg-gray-600 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded-lg w-1/3" />
        <div className="space-y-2">
          {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-200 dark:bg-gray-600 rounded-lg" />)}
        </div>
      </div>
    );
  }

  // --- Overall error state ---
  if (moleculeError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 mb-2">Failed to load molecule details</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">The molecule may not exist or has been removed.</p>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline mt-4 inline-block">Back to Home</Link>
      </div>
    );
  }

  if (!molecule) return null;

  // Harm level helpers
  const harmLabel = molecule.harm_level >= 4 ? "High" : molecule.harm_level >= 2 ? "Moderate" : "Low";
  const harmColor = molecule.harm_level >= 4 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
    molecule.harm_level >= 2 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" :
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{molecule.name}</h1>
        {molecule.iupac_name && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{molecule.iupac_name}</p>
        )}
      </div>

      {/* Harm level badge */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${harmColor}`}>
          Harm Level: {molecule.harm_level} — {harmLabel}
        </span>
        {molecule.is_heat_stable && (
          <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
            Heat Stable
          </span>
        )}
        {molecule.is_neutralizable && (
          <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-1 rounded-full">
            Neutralizable
          </span>
        )}
      </div>

      {/* Molecular Properties */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Properties</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PropertyCard label="Molecular Formula" value={molecule.molecular_formula} />
          <PropertyCard label="Molecular Weight" value={molecule.molecular_weight != null ? `${molecule.molecular_weight} g/mol` : null} />
          <PropertyCard label="CAS Number" value={molecule.cas_number} />
          <PropertyCard label="PubChem CID" value={molecule.pubchem_cid != null ? String(molecule.pubchem_cid) : null} />
        </div>
      </section>

      {/* Harm Mechanisms */}
      {molecule.harm_mechanisms && molecule.harm_mechanisms.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Harm Mechanisms</h2>
          <ul className="space-y-2">
            {molecule.harm_mechanisms.map((mechanism, i) => (
              <li key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-red-500 dark:text-red-400 mt-0.5">&#9888;</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{mechanism}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Neutralization Methods */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Neutralization Methods</h2>
        {neutralizationsError ? (
          <div className="p-4 rounded-xl border bg-red-50 dark:border-gray-700 dark:bg-red-900/30 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load neutralization methods</p>
            <button onClick={() => refetchNeutralizations()} className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline">Retry</button>
          </div>
        ) : neutralizationsLoading ? (
          <div className="space-y-2">
            {[1,2].map(n => <div key={n} className="h-12 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse" />)}
          </div>
        ) : neutralizations && neutralizations.length > 0 ? (
          <div className="space-y-2">
            {neutralizations.map((nm: unknown, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-green-500 dark:text-green-400">&#10003;</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{nm != null && typeof nm === "object" ? String((nm as any).method ?? nm) : String(nm)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No neutralization methods known.</p>
        )}
      </section>

      {/* Foods containing this molecule */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Foods Containing This Molecule</h2>
        {foodsError ? (
          <div className="p-4 rounded-xl border bg-red-50 dark:border-gray-700 dark:bg-red-900/30 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load foods</p>
            <button onClick={() => refetchFoods()} className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline">Retry</button>
          </div>
        ) : foodsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(n => (
              <div key={n} className="flex items-center p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-1 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                </div>
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
              </div>
            ))}
          </div>
        ) : foods && foods.length > 0 ? (
          <div className="space-y-2">
            {foods.map((food) => (
              <Link
                key={food.id}
                to={`/foods/${food.id}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800 hover:shadow dark:hover:border-gray-600 transition"
              >
                <div>
                  <span className="font-medium capitalize">{food.name}</span>
                  {food.category && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{food.category}</span>}
                </div>
                {food.health_index != null && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    food.health_index >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                    food.health_index >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" :
                    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}>
                    {food.health_index}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No food data available.</p>
        )}
      </section>
    </div>
  );
}

// Small helper component for property cards
function PropertyCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium">
        {value || <span className="text-gray-300 dark:text-gray-600">—</span>}
      </div>
    </div>
  );
}
