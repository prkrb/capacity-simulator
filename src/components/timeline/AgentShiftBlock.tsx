import { useRef, useState, useCallback, useMemo } from "react";
import type { Agent } from "../../types";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, MAX_SHIFT_START, SHIFT_DURATION } from "../../utils/defaults";
import { useAppContext } from "../../context/AppContext";

const LUNCH_DURATION = 0.5;

interface Segment {
  start: number;
  end: number;
  isLunch: boolean;
}

function getShiftSegments(shiftStart: number, shiftDuration: number): Segment[] {
  const shiftEnd = shiftStart + shiftDuration;
  const lunchStart = shiftStart + (shiftDuration - LUNCH_DURATION) / 2;
  const lunchEnd = lunchStart + LUNCH_DURATION;

  // Collect all boundary points within the shift
  const boundaries = new Set<number>();
  boundaries.add(shiftStart);
  boundaries.add(shiftEnd);
  boundaries.add(lunchStart);
  boundaries.add(lunchEnd);

  // Add whole-hour boundaries
  for (let h = Math.ceil(shiftStart); h < shiftEnd; h++) {
    if (h > shiftStart) boundaries.add(h);
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    const isLunch = s >= lunchStart - 0.001 && e <= lunchEnd + 0.001;
    segments.push({ start: s, end: e, isLunch });
  }

  return segments;
}

interface AgentShiftBlockProps {
  agent: Agent;
  totalWidth: number;
}

export default function AgentShiftBlock({ agent, totalWidth }: AgentShiftBlockProps) {
  const { dispatch } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);
  const startShiftRef = useRef(0);

  const hoursTotal = 12;
  const pixelsPerHour = totalWidth / hoursTotal;
  const blockWidthPercent = (SHIFT_DURATION / hoursTotal) * 100;
  const leftPercent = (agent.shiftStart / hoursTotal) * 100;

  const specialistQueues = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
  const primaryQueue = specialistQueues[0] ?? agent.queues[0];
  const color = QUEUE_COLORS[primaryQueue];

  const segments = useMemo(
    () => getShiftSegments(agent.shiftStart, agent.shiftDuration),
    [agent.shiftStart, agent.shiftDuration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startShiftRef.current = agent.shiftStart;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startXRef.current;
        const deltaHours = deltaX / pixelsPerHour;
        const newStart = Math.round(startShiftRef.current + deltaHours);
        const clamped = Math.max(0, Math.min(MAX_SHIFT_START, newStart));
        setDragOffset(((clamped - agent.shiftStart) / hoursTotal) * 100);
      };

      const handleMouseUp = (e: MouseEvent) => {
        const deltaX = e.clientX - startXRef.current;
        const deltaHours = deltaX / pixelsPerHour;
        const newStart = Math.round(startShiftRef.current + deltaHours);
        const clamped = Math.max(0, Math.min(MAX_SHIFT_START, newStart));

        dispatch({ type: "MOVE_AGENT", agentId: agent.id, shiftStart: clamped });
        setIsDragging(false);
        setDragOffset(0);

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [agent.id, agent.shiftStart, dispatch, pixelsPerHour]
  );

  return (
    <div
      className={`absolute top-1 bottom-1 cursor-grab select-none flex gap-[2px] ${
        isDragging ? "cursor-grabbing z-20" : "hover:brightness-110"
      }`}
      style={{
        left: `${leftPercent + dragOffset}%`,
        width: `${blockWidthPercent}%`,
      }}
      onMouseDown={handleMouseDown}
    >
      {segments.map((seg, i) => {
        const label =
          seg.isLunch ? "Lunch" : i === 0 ? QUEUE_SHORT_LABELS[primaryQueue] : null;

        return (
          <div
            key={i}
            className={`h-full rounded-sm flex items-center justify-center text-[10px] font-semibold overflow-hidden ${
              seg.isLunch ? "text-gray-300" : "text-white/90"
            }`}
            style={{
              flex: `${seg.end - seg.start}`,
              backgroundColor: seg.isLunch ? "#374151" : color,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
