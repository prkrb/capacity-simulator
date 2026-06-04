import { useRef, useState, useMemo } from "react";
import { useSummaryStats } from "../hooks/useCapacityCalculator";
import { useAppContext } from "../context/AppContext";
import { formatHour, HOUR_LABELS } from "../utils/defaults";
import { useCSVParser } from "../hooks/useCSVParser";
import { ALL_QUEUES, SPECIALIST_QUEUES } from "../types";
import type { QueueName } from "../types";
import { getCapacityForQueue, getTotalDailyStats, getAgentsNeeded } from "../utils/capacityCalc";
import SimulateDataModal from "./SimulateDataModal";

export default function TopSummaryBar() {
  const { state, dispatch, capacityData } = useAppContext();
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await handleFile(file);
    if (result.errors.length > 0) {
      setUploadStatus(`Error: ${result.errors[0]}`);
    } else {
      setUploadStatus(`${result.data.length} entries`);
    }
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 3000);
  };

  // Generate suggestions
  const suggestions = useMemo(() => {
    const tips: { icon: string; text: string; priority: "high" | "medium" | "low" }[] = [];

    if (state.volumeData.length === 0) {
      tips.push({ icon: "^", text: "Upload CXone volume data to see accurate coverage analysis.", priority: "high" });
      return tips;
    }

    // Per-queue deficit suggestions
    for (const queue of ALL_QUEUES) {
      const needed = getAgentsNeeded(capacityData, queue, callsPerHour);
      if (needed > 0) {
        tips.push({
          icon: "!",
          text: `${queue} needs ${needed} more agent${needed !== 1 ? "s" : ""} to cover its worst hour.`,
          priority: needed >= 3 ? "high" : "medium",
        });
      }
    }

    // Peak hour analysis
    if (peakDeficitHours.length > 0) {
      const worst = peakDeficitHours[0];
      const hourLabel = HOUR_LABELS[worst.hour];
      tips.push({
        icon: "~",
        text: `${hourLabel} is the most understaffed hour (${worst.deficit.toFixed(1)} total deficit). Consider shifting agents to cover this window.`,
        priority: "high",
      });
    }

    // Surplus detection — agents that could be reassigned
    const surplusQueues: { queue: QueueName; surplus: number }[] = [];
    for (const queue of SPECIALIST_QUEUES) {
      const stats = getTotalDailyStats(capacityData, queue);
      if (stats.totalDelta > 5) {
        surplusQueues.push({ queue, surplus: stats.totalDelta });
      }
    }
    if (surplusQueues.length > 0 && highestDeficitQueue) {
      const best = surplusQueues.sort((a, b) => b.surplus - a.surplus)[0];
      tips.push({
        icon: ">",
        text: `${best.queue} has a surplus of ${best.surplus.toFixed(1)} calls. Consider moving some agents from ${best.queue} to ${highestDeficitQueue.queue}.`,
        priority: "medium",
      });
    }

    // Multi-skill suggestion
    const singleSkillAgents = state.agents.filter((a) => {
      const specialist = a.queues.filter((q) => q !== "Config / Other" && q !== "Password");
      return specialist.length === 1;
    });
    if (singleSkillAgents.length > 10 && coverageScore < 80) {
      tips.push({
        icon: "+",
        text: `${singleSkillAgents.length} agents have only one specialist skill. Adding a second skill to some could improve coverage across queues.`,
        priority: "medium",
      });
    }

    // Shift staggering
    const shiftCounts = new Map<number, number>();
    for (const a of state.agents) {
      shiftCounts.set(a.shiftStart, (shiftCounts.get(a.shiftStart) ?? 0) + 1);
    }
    const maxShiftCount = Math.max(...shiftCounts.values());
    if (maxShiftCount > totalAgents * 0.5) {
      tips.push({
        icon: "~",
        text: `${maxShiftCount} agents share the same shift start. Staggering shifts would spread capacity more evenly across hours.`,
        priority: "medium",
      });
    }

    // Coverage is good
    if (coverageScore >= 90) {
      tips.push({
        icon: "#",
        text: `Coverage is strong at ${coverageScore}%. Consider saving this as a scenario for reference.`,
        priority: "low",
      });
    }

    if (tips.length === 0) {
      tips.push({ icon: "#", text: "No immediate suggestions. Coverage looks balanced.", priority: "low" });
    }

    return tips.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }, [state.agents, state.volumeData, capacityData, callsPerHour, coverageScore, peakDeficitHours, highestDeficitQueue, totalAgents]);

  return (
    <>
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Upload */}
          <Widget className="cursor-pointer hover:border-gray-500 transition-colors">
            <label className="cursor-pointer flex flex-col items-center">
              <WidgetLabel>Upload</WidgetLabel>
              <span className="text-sm font-semibold text-blue-400">
                {uploadStatus ?? "CXone Data"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          </Widget>

          {/* Optimize */}
          <Widget
            className="cursor-pointer hover:border-emerald-500/50 bg-emerald-500/10 border-emerald-500/20 transition-colors"
            onClick={() => dispatch({ type: "OPTIMIZE_AGENTS" })}
          >
            <WidgetLabel>Auto</WidgetLabel>
            <span className="text-sm font-semibold text-emerald-400">Optimize</span>
          </Widget>

          {/* Simulate Data */}
          <Widget
            className="cursor-pointer hover:border-blue-500/50 bg-blue-500/10 border-blue-500/20 transition-colors"
            onClick={() => setShowSimulate(true)}
          >
            <WidgetLabel>Manual</WidgetLabel>
            <span className="text-sm font-semibold text-blue-400">Simulate</span>
          </Widget>

          {/* Suggestions */}
          <Widget
            className="cursor-pointer hover:border-amber-500/50 bg-amber-500/10 border-amber-500/20 transition-colors relative"
            onClick={() => setShowSuggestions(true)}
          >
            <WidgetLabel>Tips</WidgetLabel>
            <span className="text-sm font-semibold text-amber-400">Suggestions</span>
            {suggestions.some((s) => s.priority === "high") && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </Widget>
        </div>
      </div>

      {/* Simulate Data Modal */}
      <SimulateDataModal open={showSimulate} onClose={() => setShowSimulate(false)} />

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSuggestions(false)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-gray-200">Suggestions</h2>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-500 hover:text-gray-300 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {suggestions.map((tip, i) => (
                <div
                  key={i}
                  className={`flex gap-3 rounded-lg border px-4 py-3 ${
                    tip.priority === "high"
                      ? "border-red-500/30 bg-red-500/5"
                      : tip.priority === "medium"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-green-500/30 bg-green-500/5"
                  }`}
                >
                  <span
                    className={`text-xs font-bold uppercase mt-0.5 shrink-0 ${
                      tip.priority === "high"
                        ? "text-red-400"
                        : tip.priority === "medium"
                        ? "text-amber-400"
                        : "text-green-400"
                    }`}
                  >
                    {tip.priority === "high" ? "HIGH" : tip.priority === "medium" ? "MED" : "OK"}
                  </span>
                  <span className="text-sm text-gray-300">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Widget({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex flex-col justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 min-w-0 ${className}`}
      onClick={onClick}
    >
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
