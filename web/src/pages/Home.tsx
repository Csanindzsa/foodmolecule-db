import { Link } from "react-router-dom";
import { useHomeData } from "../hooks/useApi";

export default function Home() {
  const { data, isLoading, error } = useHomeData();
  const foods = data?.foods?.slice(0, 6) || [];

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-nutrii-text">
          Know what you eat — molecule by molecule
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          nutrii maps every food ingredient to its molecular composition,
          continuously updates safety scores from live PubMed research,
          and delivers real-time health intelligence.
        </p>
        {data?.stats && (
          <div className="flex justify-center gap-8 text-sm text-gray-500 pt-4">
            <span><strong className="text-nutrii-text">{data.stats.foods}</strong> foods</span>
            <span><strong className="text-nutrii-text">{data.stats.molecules}</strong> molecules</span>
            <span><strong className="text-nutrii-text">{data.stats.studies_analyzed}</strong> studies analyzed</span>
          </div>
        )}
      </section>

      {error && (
        <div className="text-center py-8 text-red-600">
          <p>Failed to load data</p>
          <p className="text-sm text-gray-500 mt-1">Please refresh the page to try again.</p>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Featured Foods</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food) => (
              <Link
                key={food.id}
                to={`/foods/${food.id}`}
                className="block p-4 rounded-xl border bg-white shadow-sm hover:shadow transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{food.name}</span>
                  {food.health_index !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      food.health_index >= 75 ? "bg-green-100 text-green-700" :
                      food.health_index >= 50 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {food.health_index}
                    </span>
                  )}
                </div>
                {food.category && (
                  <span className="text-xs text-gray-400 mt-1 block">{food.category}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
