import { useState } from "react";
import { ALL_QUEUES } from "../../types";
import QueueChart from "./QueueChart";
import HeatMap from "./HeatMap";

export default function ChartsPanel() {
  const [view, setView] = useState<"charts" | "heatmap">("charts");

  return (
    <div>
      <div className="flex items-center gap-1 px-3 pt-2">
        <button
          onClick={() => setView("charts")}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === "charts"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          Charts
        </button>
        <button
          onClick={() => setView("heatmap")}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === "heatmap"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          Heat Map
        </button>
      </div>

      {view === "charts" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
          {ALL_QUEUES.map((queue) => (
            <QueueChart key={queue} queue={queue} />
          ))}
        </div>
      ) : (
        <HeatMap />
      )}
    </div>
  );
}
