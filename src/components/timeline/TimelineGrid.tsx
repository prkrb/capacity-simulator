import { useRef, useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, formatTime, OPERATIONAL_START } from "../../utils/defaults";
import { SPECIALIST_QUEUES } from "../../types";
import type { QueueName } from "../../types";
import HourHeaders from "./HourHeaders";
import HourDeficitRow from "./HourDeficitRow";
import AgentShiftBlock from "./AgentShiftBlock";

const LUNCH_DURATION = 0.5;

type SortMode = "time" | "focus";

function getLunchTime(shiftStart: number, shiftDuration: number): string {
  const lunchOffset = shiftStart + (shiftDuration - LUNCH_DURATION) / 2;
  const totalHours = OPERATIONAL_START + lunchOffset;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getPrimaryQueue(agent: { queues: QueueName[] }): QueueName {
  const specialist = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
  return specialist[0] ?? agent.queues[0];
}

export default function TimelineGrid() {
  const { state } = useAppContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("time");

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        const rowArea = timelineRef.current.querySelector(".timeline-row-area");
        if (rowArea) {
          setTimelineWidth(rowArea.clientWidth);
        } else {
          setTimelineWidth(timelineRef.current.clientWidth - 200);
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Ordered list of specialist queues for grouping
  const queueOrder = SPECIALIST_QUEUES.reduce<Record<string, number>>((acc, q, i) => {
    acc[q] = i;
    return acc;
  }, {});

  const sortedAgents = [...state.agents].sort((a, b) => {
    if (sortMode === "time") {
      return a.shiftStart !== b.shiftStart
        ? a.shiftStart - b.shiftStart
        : a.id.localeCompare(b.id);
    }
    // Group by primary queue in SPECIALIST_QUEUES order, then by shift start
    const aIdx = queueOrder[getPrimaryQueue(a)] ?? 99;
    const bIdx = queueOrder[getPrimaryQueue(b)] ?? 99;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.shiftStart !== b.shiftStart
      ? a.shiftStart - b.shiftStart
      : a.id.localeCompare(b.id);
  });

  return (
    <div ref={timelineRef} className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Sort controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/50">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Sort</span>
        <button
          onClick={() => setSortMode("time")}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            sortMode === "time"
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          Start Time
        </button>
        <button
          onClick={() => setSortMode("focus")}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            sortMode === "focus"
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          Focus
        </button>
      </div>

      <HourHeaders />
      <HourDeficitRow />
      <div className="overflow-y-auto flex-1">
        {/* Hidden measurement element */}
        <div className="flex invisible h-0 overflow-hidden">
          <div className="w-48 shrink-0" />
          <div className="flex-1 timeline-row-area" />
        </div>

        {sortedAgents.map((agent) => {
          const shiftEnd = agent.shiftStart + agent.shiftDuration;
          const specialistQueues = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
          const lunchTime = getLunchTime(agent.shiftStart, agent.shiftDuration);

          return (
            <div key={agent.id} className="flex border-b border-gray-800/50 hover:bg-gray-800/30">
              {/* Left info panel — stacked */}
              <div className="w-48 shrink-0 px-3 py-1.5 flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-200 font-bold">
                    {agent.id.replace("agent-", "Agent ")}
                  </span>
                  {specialistQueues.map((q) => (
                    <span
                      key={q}
                      className="text-[8px] font-bold px-1 rounded"
                      style={{ backgroundColor: QUEUE_COLORS[q], color: "white" }}
                    >
                      {QUEUE_SHORT_LABELS[q]}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">
                  {formatTime(agent.shiftStart)}–{formatTime(shiftEnd)} · {lunchTime} lunch
                </span>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative h-8">
                <AgentShiftBlock agent={agent} totalWidth={timelineWidth} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
