import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Food, HealthIndexBreakdown, Study } from "../lib/api";

export default function FoodDetail() {
  const { id } = useParams<{ id: string }>();
  const [food, setFood] = useState<Food | null>(null);
  const [health, setHealth] = useState<HealthIndexBreakdown | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);

  useEffect(() => {
    if (!id) return;
    api.food(id).then(setFood).catch(console.error);
    api.foodHealthIndex(id).then(setHealth).catch(console.error);
    api.foodStudies(id).then((data: any) => setStudies(data.results || [])).catch(console.error);
  }, [id]);

  if (!food) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold capitalize">{food.name}</h1>
          {food.category && <p className="text-gray-500">{food.category}</p>}
        </div>
        {health && (
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              health.health_index >= 75 ? "text-safety-excellent" :
              health.health_index >= 50 ? "text-safety-caution" :
              "text-safety-avoid"
            }`}>
              {health.health_index}
            </div>
            <div className="text-sm text-gray-500">{health.label}</div>
          </div>
        )}
      </div>

      {health && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-2xl font-bold">{health.benefit_score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Benefit</div>
          </div>
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-2xl font-bold">{health.safety_score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Safety</div>
          </div>
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-2xl font-bold">{health.bioavailability_score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Bioavailability</div>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Molecules</h2>
        <div className="space-y-2">
          {food.molecules?.map((fm) => (
            <div key={fm.molecule.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
              <div>
                <span className="font-medium">{fm.molecule.name}</span>
                {fm.amount_per_100g !== null && (
                  <span className="text-sm text-gray-500 ml-2">
                    {fm.amount_per_100g} {fm.unit}
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                fm.molecule.harm_level >= 4 ? "bg-red-100 text-red-700" :
                fm.molecule.harm_level >= 2 ? "bg-yellow-100 text-yellow-700" :
                fm.is_beneficial ? "bg-green-100 text-green-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {fm.molecule.harm_level >= 2 ? `Harm ${fm.molecule.harm_level}` :
                 fm.is_beneficial ? "Beneficial" : "Neutral"}
              </span>
            </div>
          )) || <p className="text-gray-400">No molecule data available.</p>}
        </div>
      </section>

      {studies.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Latest Research</h2>
          <div className="space-y-3">
            {studies.slice(0, 5).map((s) => (
              <div key={s.id} className="p-4 rounded-xl border bg-white">
                <div className="text-sm font-medium">{s.title}</div>
                {s.ai_summary && (
                  <p className="text-sm text-gray-600 mt-1">{s.ai_summary}</p>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  PMID: {s.pmid} {s.publication_year && `· ${s.publication_year}`}
                  {s.ai_confidence && ` · AI confidence: ${s.ai_confidence}`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
