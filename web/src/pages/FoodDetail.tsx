import { useParams } from "react-router-dom";
import { useFoodDetail, useFoodMolecules, useFoodStudies, useFoodGuide, useFoodHealthIndex } from "../hooks/useApi";
import { formatAmount } from "../lib/amountDisplay";
import { formatConfidence } from "../lib/confidenceDisplay";
import { formatDate } from "../lib/dateDisplay";
import { formatGuideText } from "../lib/guideDisplay";
import { foodMoleculeBadgeClass, foodMoleculeBadgeLabel } from "../lib/moleculeDisplay";
import { externalHttpUrl } from "../lib/safeUrl";
import { formatHealthLabel, formatScore, normalizeScore } from "../lib/scoreDisplay";
import { formatPublicationYear } from "../lib/yearDisplay";

export default function FoodDetail() {
  const { id } = useParams<{ id: string }>();
  const idStr = id || "";

  const { data: food, isLoading: foodLoading, error: foodError } = useFoodDetail(idStr);
  const { data: molecules, isLoading: moleculesLoading, error: moleculesError, refetch: refetchMolecules } = useFoodMolecules(idStr);
  const { data: studies, isLoading: studiesLoading, error: studiesError, refetch: refetchStudies } = useFoodStudies(idStr);
  const { data: guide, isLoading: guideLoading, error: guideError, refetch: refetchGuide } = useFoodGuide(idStr);
  const { data: health, isLoading: healthLoading, error: healthError } = useFoodHealthIndex(idStr);
  const visibleStudies = studies?.slice(0, 5) ?? [];
  const healthIndex = health ? normalizeScore(health.health_index) : null;
  const healthLabel = health ? formatHealthLabel(health.label) : null;

  if (foodLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
          </div>
          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(n => <div key={n} className="h-20 bg-gray-200 dark:bg-gray-600 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3].map(n => <div key={n} className="h-14 bg-gray-200 dark:bg-gray-600 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (foodError) {
    return (
      <div className="text-center py-16 text-red-600 dark:text-red-400">
        <p>Failed to load food details</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">The page may have refreshed or the food no longer exists.</p>
      </div>
    );
  }

  if (!food) return null;
  const foodImageUrl = externalHttpUrl(food.image_url);
  const guideText = formatGuideText(guide?.guide);
  const guideGeneratedAt = formatDate(guide?.generated_at);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {foodImageUrl && (
            <img
              src={foodImageUrl}
              alt={`Food photo: ${food.name}`}
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-lg border bg-gray-50 object-cover dark:border-gray-700 dark:bg-gray-800"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold capitalize">{food.name}</h1>
            {food.category && <p className="text-gray-500 dark:text-gray-400">{food.category}</p>}
          </div>
        </div>
        {healthLoading && !foodLoading ? (
          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse" />
        ) : health && !healthError && healthIndex !== null ? (
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              healthIndex >= 75 ? "text-safety-excellent" :
              healthIndex >= 50 ? "text-safety-caution" :
              "text-safety-avoid"
            }`}>
              {healthIndex}
            </div>
            {healthLabel && <div className="text-sm text-gray-500 dark:text-gray-400">{healthLabel}</div>}
          </div>
        ) : null}
      </div>

      {healthLoading && !foodLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[1,2,3].map(n => (
            <div key={n} className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mx-auto mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20 mx-auto" />
            </div>
          ))}
        </div>
      ) : health && !healthError ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="text-2xl font-bold">{formatScore(health.benefit_score, "—")}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Benefit</div>
          </div>
          <div className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="text-2xl font-bold">{formatScore(health.safety_score, "—")}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Safety</div>
          </div>
          <div className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="text-2xl font-bold">{formatScore(health.bioavailability_score, "—")}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bioavailability</div>
          </div>
        </div>
      ) : null}

      {(guideText || guideLoading || guideError) && (
        <section className="p-4 rounded-xl border bg-blue-50 dark:border-gray-700 dark:bg-blue-900/30">
          <h2 className="text-lg font-semibold mb-2">Agent Guide</h2>
          {guideError ? (
            <div className="p-4 rounded-xl border bg-red-50 dark:border-gray-700 dark:bg-red-900/30 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load agent guide</p>
              <button 
                onClick={() => refetchGuide()}
                className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : guideLoading ? (
            <div className="h-20 bg-blue-100 dark:bg-blue-900/40 animate-pulse rounded" />
          ) : guide ? (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {guideText}
              </div>
              {guideGeneratedAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Generated: {guideGeneratedAt}</p>
              )}
            </>
          ) : null}
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Molecules</h2>
        {moleculesError ? (
          <div className="p-4 rounded-xl border bg-red-50 dark:border-gray-700 dark:bg-red-900/30 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load molecules</p>
            <button 
              onClick={() => refetchMolecules()}
              className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        ) : moleculesLoading && !foodError ? (
          <div className="space-y-2">
            {[1,2,3].map(n => (
              <div key={n} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : molecules && molecules.length > 0 ? (
          <div className="space-y-2">
            {molecules.map((fm) => {
              const amount = formatAmount(fm.amount_per_100g, fm.unit);

              return (
              <div key={fm.molecule.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <span className="font-medium">{fm.molecule.name}</span>
                  {amount && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {amount}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  foodMoleculeBadgeClass(fm.molecule.harm_level, fm.is_beneficial)
                }`}>
                  {foodMoleculeBadgeLabel(fm.molecule.harm_level, fm.is_beneficial)}
                </span>
              </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-gray-500">No molecule data available.</p>
        )}
      </section>

      {(studiesError || studiesLoading || visibleStudies.length > 0) && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Latest Research</h2>
          {studiesError ? (
            <div className="p-4 rounded-xl border bg-red-50 dark:border-gray-700 dark:bg-red-900/30 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load studies</p>
              <button 
                onClick={() => refetchStudies()}
                className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : studiesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(n => (
                <div key={n} className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleStudies.map((s) => {
                const citationUrl = externalHttpUrl(s.url);
                const aiConfidence = formatConfidence(s.ai_confidence);
                const publicationYear = formatPublicationYear(s.publication_year);

                return (
                  <div key={s.id} className="p-4 rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-sm font-medium">{s.title}</div>
                    {s.ai_summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{s.ai_summary}</p>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      PMID: {citationUrl ? (
                        <a
                          href={citationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-green-700 hover:underline dark:text-green-400"
                        >
                          {s.pmid}
                        </a>
                      ) : (
                        s.pmid
                      )} {publicationYear && `· ${publicationYear}`}
                      {aiConfidence && ` · ${aiConfidence}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
