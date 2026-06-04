import { useRef, useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, formatTime, OPERATIONAL_START } from "../../utils/defaults";
import HourHeaders from "./HourHeaders";
import HourDeficitRow from "./HourDeficitRow";
import AgentShiftBlock from "./AgentShiftBlock";

const LUNCH_DURATION = 0.5;

function getLunchTime(shiftStart: number, shiftDuration: number): string {
  const lunchOffset = shiftStart + (shiftDuration - LUNCH_DURATION) / 2;
  const totalHours = OPERATIONAL_START + lunchOffset;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function TimelineGrid() {
  const { state } = useAppContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        const rowArea = timelineRef.current.querySelector(".timeline-row-area");
        if (rowArea) {
          setTimelineWidth(rowArea.clientWidth);
        } else {
          setTimelineWidth(timelineRef.current.clientWidth - 240);
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Flat list sorted by shiftStart then ID
  const sortedAgents = [...state.agents].sort((a, b) =>
    a.shiftStart !== b.shiftStart ? a.shiftStart - b.shiftStart : a.id.localeCompare(b.id)
  );

  return (
    <div ref={timelineRef} className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <HourHeaders />
      <HourDeficitRow />
      <div className="overflow-y-auto flex-1">
        {/* Hidden measurement element */}
        <div className="flex invisible h-0 overflow-hidden">
          <div className="w-60 shrink-0" />
          <div className="flex-1 timeline-row-area" />
        </div>

        {sortedAgents.map((agent) => {
          const shiftEnd = agent.shiftStart + agent.shiftDuration;
          const specialistQueues = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
          const lunchTime = getLunchTime(agent.shiftStart, agent.shiftDuration);

          return (
            <div key={agent.id} className="flex border-b border-gray-800/50 hover:bg-gray-800/30">
              {/* Left info panel */}
              <div className="w-60 shrink-0 px-3 py-1 flex items-center gap-2">
                {/* Agent ID */}
                <span className="text-xs text-gray-300 font-mono font-semibold w-8 shrink-0">
                  {agent.id.replace("agent-", "A")}
                </span>

                {/* Shift time */}
                <span className="text-[10px] text-gray-500 shrink-0 w-20">
                  {formatTime(agent.shiftStart)}–{formatTime(shiftEnd)}
                </span>

                {/* Lunch time */}
                <span className="text-[10px] text-gray-600 shrink-0 w-14">
                  {lunchTime}
                </span>

                {/* Queue dots */}
                <div className="flex gap-0.5">
                  {specialistQueues.map((q) => (
                    <span
                      key={q}
                      className="text-[7px] font-bold px-1 py-0 rounded"
                      style={{ backgroundColor: QUEUE_COLORS[q], color: "white" }}
                      title={q}
                    >
                      {QUEUE_SHORT_LABELS[q]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative h-8">
                {/* Hour grid lines */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-gray-800/50"
                    style={{ left: `${(i / 12) * 100}%` }}
                  />
                ))}
                <AgentShiftBlock agent={agent} totalWidth={timelineWidth} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
