import { useRecentStudies } from "../hooks/useApi";

function impactLabel(value: number | null): string | null {
  if (value == null) return null;
  if (value > 0) return `+${value}`;
  return String(value);
}

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
          {studies.map((study) => (
            <article key={study.id} className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-base font-semibold leading-snug">{study.title}</h2>
                {study.ai_confidence && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    AI confidence: {study.ai_confidence}
                  </span>
                )}
              </div>

              {study.ai_summary && (
                <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">{study.ai_summary}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  PMID:{" "}
                  {study.url ? (
                    <a
                      href={study.url}
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
                {study.publication_year && <span>{study.publication_year}</span>}
                {study.journal && <span>{study.journal}</span>}
                {impactLabel(study.ai_safety_impact) && (
                  <span>Safety impact: {impactLabel(study.ai_safety_impact)}</span>
                )}
                {impactLabel(study.ai_health_impact) && (
                  <span>Health impact: {impactLabel(study.ai_health_impact)}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
