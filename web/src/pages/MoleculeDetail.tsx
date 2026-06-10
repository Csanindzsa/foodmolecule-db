import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMoleculeDetail, useMoleculeFoods, useMoleculeNeutralizations } from "../hooks/useApi";
import {
  formatHarmLevel,
  formatMolecularWeight,
  formatPubChemCid,
  formatReductionPercent,
  harmLevelBadgeClass,
  harmLevelLabel,
} from "../lib/moleculeDisplay";
import { validRouteId } from "../lib/routeId";
import { externalHttpUrl } from "../lib/safeUrl";
import { normalizeScore, scoreBadgeClass } from "../lib/scoreDisplay";
import { formatOptionalText } from "../lib/textDisplay";
import type { MoleculeNeutralization } from "../types";

type NeutralizationDisplay = MoleculeNeutralization | string | null;

function neutralizationMethodName(neutralization: NeutralizationDisplay): string {
  if (typeof neutralization === "string") return neutralization;
  if (!neutralization) return "Unknown method";
  if (typeof neutralization.method === "string") return neutralization.method;
  return neutralization.method?.name || "Unknown method";
}

function neutralizationDetails(neutralization: NeutralizationDisplay): string[] {
  if (!neutralization || typeof neutralization === "string") return [];

  const details: string[] = [];
  const min = formatReductionPercent(neutralization.reduction_percent_min);
  const max = formatReductionPercent(neutralization.reduction_percent_max);
  if (min && max) {
    details.push(min === max ? `${min}% reduction` : `${min}-${max}% reduction`);
  } else if (min) {
    details.push(`At least ${min}% reduction`);
  } else if (max) {
    details.push(`Up to ${max}% reduction`);
  }
  if (neutralization.time_required) details.push(neutralization.time_required);
  if (neutralization.confidence) details.push(`${neutralization.confidence} confidence`);
  return details;
}

export default function MoleculeDetail() {
  const { id } = useParams<{ id: string }>();
  const routeId = validRouteId(id);
  const idStr = routeId ?? "";

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

  if (!routeId) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 mb-2">Invalid molecule link</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Open this molecule from search or a food detail page.</p>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline mt-4 inline-block">Back to Home</Link>
      </div>
    );
  }

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

  const harmLevel = formatHarmLevel(molecule.harm_level, "?");
  const harmLabel = harmLevelLabel(molecule.harm_level);
  const harmColor = harmLevelBadgeClass(molecule.harm_level);
  const molecularFormula = formatOptionalText(molecule.molecular_formula);
  const molecularWeight = formatMolecularWeight(molecule.molecular_weight);
  const casNumber = formatOptionalText(molecule.cas_number);
  const pubChemCid = formatPubChemCid(molecule.pubchem_cid);
  const structureImageUrl = externalHttpUrl(molecule.structure_image_url);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{molecule.name}</h1>
          {molecule.iupac_name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{molecule.iupac_name}</p>
          )}
        </div>
        {structureImageUrl && (
          <img
            src={structureImageUrl}
            alt={`Molecular structure: ${molecule.name}`}
            loading="lazy"
            className="h-40 w-40 rounded-lg border bg-white object-contain p-3 dark:border-gray-700 dark:bg-gray-800"
          />
        )}
      </div>

      {/* Harm level badge */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${harmColor}`}>
          Harm Level: {harmLevel} — {harmLabel}
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
          <PropertyCard label="Molecular Formula" value={molecularFormula} />
          <PropertyCard label="Molecular Weight" value={molecularWeight != null ? `${molecularWeight} g/mol` : null} />
          <PropertyCard label="CAS Number" value={casNumber} />
          <PropertyCard label="PubChem CID" value={pubChemCid} />
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
            {neutralizations.map((neutralization: NeutralizationDisplay, i: number) => {
              const details = neutralizationDetails(neutralization);
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-green-500 dark:text-green-400 mt-0.5">&#10003;</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {neutralizationMethodName(neutralization)}
                    </div>
                    {details.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {details.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
            {foods.map((food) => {
              const healthIndex = normalizeScore(food.health_index);
              const category = formatOptionalText(food.category);

              return (
                <Link
                  key={food.id}
                  to={`/foods/${food.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800 hover:shadow dark:hover:border-gray-600 transition"
                >
                  <div>
                    <span className="font-medium capitalize">{food.name}</span>
                    {category && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{category}</span>}
                  </div>
                  {healthIndex !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBadgeClass(healthIndex)}`}>
                      {healthIndex}
                    </span>
                  )}
                </Link>
              );
            })}
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
