import { useRef, useState, useMemo, useCallback } from "react";
import { useSummaryStats } from "../hooks/useCapacityCalculator";
import { useAppContext } from "../context/AppContext";
import { formatHour, HOUR_LABELS, SHIFT_DURATION, createAgent, DEFAULT_QUEUES } from "../utils/defaults";
import { useCSVParser } from "../hooks/useCSVParser";
import { ALL_QUEUES, SPECIALIST_QUEUES } from "../types";
import type { QueueName } from "../types";
import { getTotalDailyStats, getAgentsNeeded } from "../utils/capacityCalc";
import SimulateDataModal from "./SimulateDataModal";

const LUNCH_DURATION = 0.5;

export default function TopSummaryBar() {
  const { state, dispatch, capacityData } = useAppContext();
  const {
    totalAgents,
    callsPerDay,
    totalCapacity,
    totalVolume,
    totalDelta,
    peakDeficitHours,
    highestDeficitQueue,
    coverageScore,
  } = useSummaryStats();

  // Derived KPIs
  const effectiveHours = SHIFT_DURATION - LUNCH_DURATION;
  const aht = ((effectiveHours * 60) / callsPerDay).toFixed(1);

  const peakHourLabel =
    peakDeficitHours.length > 0
      ? formatHour(peakDeficitHours[0].hour)
      : "None";

  const deficitQueueLabel = highestDeficitQueue
    ? highestDeficitQueue.queue
    : "None";

  const deficitQueueValue = highestDeficitQueue
    ? highestDeficitQueue.deficit.toFixed(1)
    : null;

  const coverageColor =
    coverageScore >= 80 ? "text-green-400" : coverageScore >= 50 ? "text-amber-400" : "text-red-400";
  const coverageDotColor =
    coverageScore >= 80 ? "bg-green-500" : coverageScore >= 50 ? "bg-amber-500" : "bg-red-500";

  const deltaColor = totalDelta >= 0 ? "text-green-400" : "text-red-400";
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
    const tips: { icon: string; text: string; priority: "high" | "medium" | "low"; actionLabel?: string; actionKey?: string }[] = [];

    if (state.volumeData.length === 0) {
      tips.push({ icon: "^", text: "Upload CXone volume data to see accurate coverage analysis.", priority: "high" });
      return tips;
    }

    for (const queue of ALL_QUEUES) {
      const needed = getAgentsNeeded(capacityData, queue, callsPerDay);
      if (needed > 0) {
        tips.push({
          icon: "!",
          text: `${queue} needs ${needed} more agent${needed !== 1 ? "s" : ""} to cover its worst hour.`,
          priority: needed >= 3 ? "high" : "medium",
          actionLabel: `Add ${needed}`,
          actionKey: `add-agents:${queue}:${needed}`,
        });
      }
    }

    if (peakDeficitHours.length > 0) {
      const worst = peakDeficitHours[0];
      const hourLabel = HOUR_LABELS[worst.hour];
      tips.push({
        icon: "~",
        text: `${hourLabel} is the most understaffed hour (${worst.deficit.toFixed(1)} total deficit). Consider shifting agents to cover this window.`,
        priority: "high",
      });
    }

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
        actionLabel: "Optimize",
        actionKey: "optimize",
      });
    }

    const singleSkillAgents = state.agents.filter((a) => {
      const specialist = a.queues.filter((q) => q !== "Config / Other" && q !== "Password");
      return specialist.length === 1;
    });
    if (singleSkillAgents.length > 10 && coverageScore < 80) {
      tips.push({
        icon: "+",
        text: `${singleSkillAgents.length} agents have only one specialist skill. Adding a second skill to some could improve coverage across queues.`,
        priority: "medium",
        actionLabel: "Optimize",
        actionKey: "optimize",
      });
    }

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
  }, [state.agents, state.volumeData, capacityData, callsPerDay, coverageScore, peakDeficitHours, highestDeficitQueue, totalAgents]);

  const handleSuggestionAction = useCallback((actionKey: string) => {
    if (actionKey === "optimize") {
      dispatch({ type: "OPTIMIZE_AGENTS" });
    } else if (actionKey.startsWith("add-agents:")) {
      const parts = actionKey.split(":");
      const queue = parts[1] as QueueName;
      const count = parseInt(parts[2], 10);
      const nextId = state.agents.length > 0
        ? Math.max(...state.agents.map((a) => parseInt(a.id.replace("agent-", ""), 10) || 0)) + 1
        : 1;
      for (let i = 0; i < count; i++) {
        const queues = DEFAULT_QUEUES.includes(queue)
          ? [...DEFAULT_QUEUES]
          : [...DEFAULT_QUEUES, queue];
        dispatch({ type: "ADD_AGENT", agent: createAgent(nextId + i, queues) });
      }
    }
  }, [dispatch, state.agents]);

  return (
    <>
      <div className="bg-gray-800/50 border-b border-gray-700 px-5 py-3">
        <div className="flex flex-wrap items-stretch gap-3">
          {/* KPI Cards */}
          <KpiCard dot="bg-blue-500" label="Total Agents" value={String(totalAgents)} sub="active" />

          <KpiCard dot="bg-purple-500" label="Avg Handle Time" value={`${aht} min`} sub={`${callsPerDay} calls/day`} />

          <div className="flex flex-col justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Calls/Day</span>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={callsPerDay}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  dispatch({ type: "SET_CALLS_PER_DAY", callsPerDay: val });
                }
              }}
              className="w-16 bg-gray-700 text-white text-lg font-bold rounded px-2 py-0.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <KpiCard dot="bg-cyan-500" label="Daily Volume" value={totalVolume.toLocaleString()} sub="total calls" />

          <KpiCard dot="bg-teal-500" label="Total Capacity" value={totalCapacity.toFixed(1)} sub="calls covered" />

          <KpiCard
            dot={totalDelta >= 0 ? "bg-green-500" : "bg-red-500"}
            label="Surplus / Deficit"
            value={`${deltaPrefix}${totalDelta.toFixed(1)}`}
            valueColor={deltaColor}
            sub={totalDelta >= 0 ? "surplus" : "deficit"}
          />

          <KpiCard
            dot={coverageDotColor}
            label="Coverage Score"
            value={`${coverageScore}%`}
            valueColor={coverageColor}
            sub={coverageScore >= 80 ? "healthy" : coverageScore >= 50 ? "at risk" : "critical"}
          />

          <KpiCard dot="bg-orange-500" label="Peak Hour" value={peakHourLabel} sub="most understaffed" />

          <KpiCard
            dot="bg-red-500"
            label="Worst Queue"
            value={deficitQueueLabel}
            sub={deficitQueueValue ? `${deficitQueueValue} deficit` : "all covered"}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <ActionCard color="blue" label="Upload" onClick={() => fileRef.current?.click()}>
            {uploadStatus ?? "CXone Data"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="hidden"
            />
          </ActionCard>

          <ActionCard color="emerald" label="Auto" onClick={() => dispatch({ type: "OPTIMIZE_AGENTS" })}>
            Optimize
          </ActionCard>

          <ActionCard color="blue" label="Manual" onClick={() => setShowSimulate(true)}>
            Simulate
          </ActionCard>

          <ActionCard
            color="amber"
            label="Tips"
            onClick={() => setShowSuggestions(true)}
            badge={suggestions.some((s) => s.priority === "high")}
          >
            Suggestions
          </ActionCard>
        </div>
      </div>

      <SimulateDataModal open={showSimulate} onClose={() => setShowSimulate(false)} />

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
                x
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
                  <span className="text-sm text-gray-300 flex-1">{tip.text}</span>
                  {tip.actionKey && (
                    <button
                      onClick={() => handleSuggestionAction(tip.actionKey!)}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      {tip.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KpiCard({
  dot,
  label,
  value,
  valueColor = "text-white",
  sub,
}: {
  dot: string;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className={`text-lg font-bold leading-tight ${valueColor}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-500 mt-0.5">{sub}</span>}
    </div>
  );
}

function ActionCard({
  color,
  label,
  onClick,
  badge,
  children,
}: {
  color: "blue" | "emerald" | "amber";
  label: string;
  onClick?: () => void;
  badge?: boolean;
  children: React.ReactNode;
}) {
  const styles = {
    blue: "hover:border-blue-500/50 bg-blue-500/10 border-blue-500/20",
    emerald: "hover:border-emerald-500/50 bg-emerald-500/10 border-emerald-500/20",
    amber: "hover:border-amber-500/50 bg-amber-500/10 border-amber-500/20",
  };
  const textColor = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <div
      className={`flex flex-col justify-center rounded-lg border bg-gray-800 px-4 py-2.5 min-w-0 cursor-pointer transition-colors relative ${styles[color]}`}
      onClick={onClick}
    >
      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</span>
      <span className={`text-sm font-semibold ${textColor[color]}`}>{children}</span>
      {badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />}
    </div>
  );
}
