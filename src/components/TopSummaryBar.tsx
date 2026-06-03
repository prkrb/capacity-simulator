import { useSummaryStats } from "../hooks/useCapacityCalculator";
import { useAppContext } from "../context/AppContext";
import { formatHour } from "../utils/defaults";

export default function TopSummaryBar() {
  const { dispatch } = useAppContext();
  const {
    totalAgents,
    callsPerHour,
    totalCapacity,
    totalVolume,
    totalDelta,
    peakDeficitHours,
    highestDeficitQueue,
    coverageScore,
  } = useSummaryStats();

  const peakHourLabel =
    peakDeficitHours.length > 0
      ? formatHour(peakDeficitHours[0].hour)
      : "None";

  const deficitQueueLabel = highestDeficitQueue
    ? `${highestDeficitQueue.queue} (${highestDeficitQueue.deficit.toFixed(1)})`
    : "None";

  const coverageColor =
    coverageScore >= 80 ? "text-green-400" : coverageScore >= 50 ? "text-amber-400" : "text-red-400";

  const deltaColor = totalDelta >= 0 ? "text-green-400" : "text-red-400";
  const deltaPrefix = totalDelta >= 0 ? "+" : "";

  return (
    <div className="flex items-center gap-6 bg-gray-800 border-b border-gray-700 px-6 py-3 text-sm">
      <Stat label="Total Agents" value={totalAgents.toString()} />
      <div className="flex flex-col">
        <span className="text-gray-400 text-xs uppercase tracking-wide">Calls/Hr</span>
        <input
          type="number"
          min={0.5}
          max={10}
          step={0.5}
          value={callsPerHour}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
              dispatch({ type: "SET_CALLS_PER_HOUR", callsPerHour: val });
            }
          }}
          className="w-16 bg-gray-700 text-white text-sm font-semibold rounded px-2 py-0.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <Stat label="Total Capacity" value={totalCapacity.toFixed(1)} />
      <Stat label="Total Volume" value={totalVolume.toString()} />
      <Stat label="Total Deficit" value={`${deltaPrefix}${totalDelta.toFixed(1)}`} className={deltaColor} />
      <div className="w-px h-8 bg-gray-700" />
      <Stat label="Peak Understaffed" value={peakHourLabel} />
      <Stat label="Highest Deficit" value={deficitQueueLabel} />
      <Stat label="Coverage" value={`${coverageScore}%`} className={coverageColor} />
    </div>
  );
}

function Stat({ label, value, className = "text-white" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      <span className={`font-semibold ${className}`}>{value}</span>
    </div>
  );
}
