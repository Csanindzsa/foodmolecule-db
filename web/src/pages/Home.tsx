import { Link } from "react-router-dom";
import { useHomeData } from "../hooks/useApi";
import { externalHttpUrl } from "../lib/safeUrl";
import { normalizeScore, scoreBadgeClass } from "../lib/scoreDisplay";
import { formatOptionalText } from "../lib/textDisplay";

function foodCardKey(food: { id?: string; name?: string }, index: number) {
  return food.id || `${food.name || "food"}-${index}`;
}

export default function Home() {
  const { data, isLoading, error } = useHomeData();
  const foods = data?.foods?.slice(0, 6) || [];

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-nutrii-text">
          Know what you eat — molecule by molecule
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          nutrii maps every food ingredient to its molecular composition,
          continuously updates safety scores from live PubMed research,
          and delivers real-time health intelligence.
        </p>
        {data?.stats && (
          <div className="flex justify-center gap-8 text-sm text-gray-500 dark:text-gray-400 pt-4">
            <span><strong className="text-nutrii-text">{data.stats.foods}</strong> foods</span>
            <span><strong className="text-nutrii-text">{data.stats.molecules}</strong> molecules</span>
            <span><strong className="text-nutrii-text">{data.stats.studies_analyzed}</strong> studies analyzed</span>
          </div>
        )}
      </section>

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          <p>Failed to load data</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please refresh the page to try again.</p>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Featured Foods</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food, index) => {
              const healthIndex = normalizeScore(food.health_index);
              const imageUrl = externalHttpUrl(food.image_url);
              const category = formatOptionalText(food.category);

              return (
                <Link
                  key={foodCardKey(food, index)}
                  to={`/foods/${food.id || ""}`}
                  className="block p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow dark:hover:border-gray-600 transition"
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Food photo: ${food.name}`}
                      loading="lazy"
                      className="mb-3 h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{food.name}</span>
                    {healthIndex !== null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBadgeClass(healthIndex)}`}>
                        {healthIndex}
                      </span>
                    )}
                  </div>
                  {category && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">{category}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
