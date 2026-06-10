import { useRecentStudies } from "../hooks/useApi";
import { formatConfidence } from "../lib/confidenceDisplay";
import { formatImpact } from "../lib/impactDisplay";
import { externalHttpUrl } from "../lib/safeUrl";
import { formatPublicationYear } from "../lib/yearDisplay";

export default function Research() {
  const { data: studies, isLoading, error, refetch } = useRecentStudies();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Latest Research</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Recent PubMed studies analyzed by the nutrii research pipeline.
          </p>
        </div>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="mb-2 h-3 w-full rounded bg-gray-200 dark:bg-gray-600" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 mb-2">Failed to load latest research</p>
        <button
          onClick={() => refetch()}
          className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Latest Research</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Recent AI-analyzed PubMed studies with citation links, safety impact, and confidence context.
        </p>
      </div>

      {!studies || studies.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No analyzed research studies found.</p>
      ) : (
        <div className="space-y-3">
          {studies.map((study) => {
            const citationUrl = externalHttpUrl(study.url);
            const aiConfidence = formatConfidence(study.ai_confidence);
            const safetyImpact = formatImpact(study.ai_safety_impact);
            const healthImpact = formatImpact(study.ai_health_impact);
            const publicationYear = formatPublicationYear(study.publication_year);

            return (
              <article key={study.id} className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="text-base font-semibold leading-snug">{study.title}</h2>
                  {aiConfidence && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      {aiConfidence}
                    </span>
                  )}
                </div>

                {study.ai_summary && (
                  <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">{study.ai_summary}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    PMID:{" "}
                    {citationUrl ? (
                      <a
                        href={citationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-green-700 hover:underline dark:text-green-400"
                      >
                        {study.pmid}
                      </a>
                    ) : (
                      study.pmid
                    )}
                  </span>
                  {publicationYear && <span>{publicationYear}</span>}
                  {study.journal && <span>{study.journal}</span>}
                  {safetyImpact && (
                    <span>Safety impact: {safetyImpact}</span>
                  )}
                  {healthImpact && (
                    <span>Health impact: {healthImpact}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
