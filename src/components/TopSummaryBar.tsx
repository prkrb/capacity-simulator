import { useRef, useState } from "react";
import { useSummaryStats } from "../hooks/useCapacityCalculator";
import { useAppContext } from "../context/AppContext";
import { formatHour } from "../utils/defaults";
import { useCSVParser } from "../hooks/useCSVParser";

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
      : "—";

  const deficitQueueLabel = highestDeficitQueue
    ? highestDeficitQueue.queue
    : "—";

  const deficitQueueValue = highestDeficitQueue
    ? highestDeficitQueue.deficit.toFixed(1)
    : null;

  const coverageColor =
    coverageScore >= 80 ? "text-green-400" : coverageScore >= 50 ? "text-amber-400" : "text-red-400";
  const coverageBg =
    coverageScore >= 80 ? "bg-green-500/10 border-green-500/20" : coverageScore >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  const deltaColor = totalDelta >= 0 ? "text-green-400" : "text-red-400";
  const deltaBg = totalDelta >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20";
  const deltaPrefix = totalDelta >= 0 ? "+" : "";

  const { handleFile } = useCSVParser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await handleFile(file);
    if (result.errors.length > 0) {
      setUploadStatus(`Error: ${result.errors[0]}`);
    } else {
      setUploadStatus(`Loaded ${result.data.length} entries`);
    }
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 3000);
  };

  return (
    <div className="bg-gray-800/50 border-b border-gray-700 px-5 py-4">
      <div className="flex flex-wrap items-stretch gap-3">
        {/* Agents */}
        <Widget>
          <WidgetLabel>Agents</WidgetLabel>
          <WidgetValue>{totalAgents}</WidgetValue>
        </Widget>

        {/* Calls/Hr */}
        <Widget>
          <WidgetLabel>Calls/Hr</WidgetLabel>
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
            className="w-16 bg-gray-700 text-white text-xl font-bold rounded px-2 py-0.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </Widget>

        {/* Capacity */}
        <Widget>
          <WidgetLabel>Total Capacity</WidgetLabel>
          <WidgetValue>{totalCapacity.toFixed(1)}</WidgetValue>
        </Widget>

        {/* Volume */}
        <Widget>
          <WidgetLabel>Total Volume</WidgetLabel>
          <WidgetValue>{totalVolume}</WidgetValue>
        </Widget>

        {/* Deficit */}
        <Widget className={deltaBg}>
          <WidgetLabel>Total Deficit</WidgetLabel>
          <WidgetValue className={deltaColor}>
            {deltaPrefix}{totalDelta.toFixed(1)}
          </WidgetValue>
        </Widget>

        {/* Coverage Score */}
        <Widget className={coverageBg}>
          <WidgetLabel>Coverage</WidgetLabel>
          <WidgetValue className={coverageColor}>{coverageScore}%</WidgetValue>
        </Widget>

        {/* Peak Understaffed */}
        <Widget>
          <WidgetLabel>Peak Understaffed</WidgetLabel>
          <WidgetValue className="text-gray-200">{peakHourLabel}</WidgetValue>
        </Widget>

        {/* Highest Deficit Queue */}
        <Widget>
          <WidgetLabel>Worst Queue</WidgetLabel>
          <WidgetValue className="text-gray-200 text-base">{deficitQueueLabel}</WidgetValue>
          {deficitQueueValue && (
            <span className="text-xs text-red-400 font-medium">{deficitQueueValue}</span>
          )}
        </Widget>

        {/* Spacer to push buttons right */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex flex-col items-end justify-center gap-1.5">
          <label className="flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg px-4 py-2 cursor-pointer transition-colors">
            Upload CXone Data
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
          <button
            onClick={() => dispatch({ type: "OPTIMIZE_AGENTS" })}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            Optimize
          </button>
          {uploadStatus && (
            <span className="text-[10px] text-gray-400">{uploadStatus}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Widget({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

function WidgetLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-gray-400 text-[11px] uppercase tracking-wider font-medium mb-0.5">
      {children}
    </span>
  );
}

function WidgetValue({ children, className = "text-white" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xl font-bold leading-tight ${className}`}>
      {children}
    </span>
  );
}
