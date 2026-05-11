import { useState } from "react";
import { Link } from "react-router-dom";
import { useBanList } from "../hooks/useApi";
import type { BanListEntry } from "../types";

type SortKey = "food_name" | "category" | "health_index" | "reason" | "lethal_dose" | "status";

function SortIcon({ column, activeColumn, activeDirection }: { column: SortKey; activeColumn: SortKey; activeDirection: "asc" | "desc" }) {
  if (activeColumn !== column) return <span className="text-gray-300 dark:text-gray-600 ml-1">&#8597;</span>;
  return <span className="text-gray-700 dark:text-gray-300 ml-1">{activeDirection === "asc" ? "↑" : "↓"}</span>;
}

function SortHeader({ column, activeColumn, activeDirection, onSort, children }: { column: SortKey; activeColumn: SortKey; activeDirection: "asc" | "desc"; onSort: (col: SortKey) => void; children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
      <button type="button" onClick={() => onSort(column)} className="flex items-center w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600 py-1 -my-1 px-1 -mx-1 rounded">
        {children}
        <SortIcon column={column} activeColumn={activeColumn} activeDirection={activeDirection} />
      </button>
    </th>
  );
}

export default function BanList() {
  const { data: entries, isLoading, error, refetch } = useBanList();
  const [sortColumn, setSortColumn] = useState<SortKey>("food_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (col: SortKey) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const sortedEntries = [...(entries || [])].sort((a: BanListEntry, b: BanListEntry) => {
    let aVal: string | number | boolean | null = "";
    let bVal: string | number | boolean | null = "";

    switch (sortColumn) {
      case "food_name":
        aVal = a.food?.name?.toLowerCase() || "";
        bVal = b.food?.name?.toLowerCase() || "";
        break;
      case "category":
        aVal = a.food?.category?.toLowerCase() || "";
        bVal = b.food?.category?.toLowerCase() || "";
        break;
      case "health_index":
        aVal = a.food?.health_index ?? -1;
        bVal = b.food?.health_index ?? -1;
        break;
      case "reason":
        aVal = a.reason.toLowerCase();
        bVal = b.reason.toLowerCase();
        break;
      case "lethal_dose":
        aVal = a.lethal_dose_mg ?? -1;
        bVal = b.lethal_dose_mg ?? -1;
        break;
      case "status":
        aVal = a.is_conditionally_safe ? "conditional" : "absolute";
        bVal = b.is_conditionally_safe ? "conditional" : "absolute";
        break;
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Ban List</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded" />
          {[1,2,3,4,5].map(n => <div key={n} className="h-14 bg-gray-200 dark:bg-gray-600 rounded" />)} 
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 mb-2">Failed to load ban list</p>
        <button onClick={() => refetch()} className="text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline">Retry</button>
        <br />
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline mt-4 inline-block">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ban List</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Substances and foods flagged for safety concerns.
      </p>

      {sortedEntries.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No ban list entries found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <SortHeader column="food_name" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Food</SortHeader>
                <SortHeader column="category" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Category</SortHeader>
                <SortHeader column="health_index" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Health Index</SortHeader>
                <SortHeader column="reason" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Reason</SortHeader>
                <SortHeader column="lethal_dose" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Lethal Dose</SortHeader>
                <SortHeader column="status" activeColumn={sortColumn} activeDirection={sortDirection} onSort={handleSort}>Status</SortHeader>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm">
                    {entry.food ? (
                      <Link to={`/foods/${entry.food.id}`} className="font-medium capitalize text-blue-600 dark:text-blue-400 hover:underline">
                        {entry.food.name}
                      </Link>
                    ) : (
                      <span className="italic text-gray-400 dark:text-gray-500">Unknown food</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {entry.food?.category || <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.food?.health_index != null ? (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        entry.food.health_index >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                        entry.food.health_index >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" :
                        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }`}>
                        {entry.food.health_index}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                    <div className="line-clamp-2">{entry.reason}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {entry.lethal_dose_mg != null ? `${entry.lethal_dose_mg} mg` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.is_conditionally_safe ? (
                      <span title={entry.safe_condition || "Conditionally safe"} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                        Conditional
                        {entry.safe_condition && (
                          <span className="ml-0.5 cursor-help">&#9432;</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        Absolute
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
