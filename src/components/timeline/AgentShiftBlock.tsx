import { useRef, useState, useCallback, useMemo } from "react";
import type { Agent } from "../../types";
import { QUEUE_COLORS, MAX_SHIFT_START } from "../../utils/defaults";
import { useAppContext } from "../../context/AppContext";

const LUNCH_DURATION = 0.5;

type SegmentType = "empty" | "active" | "lunch";

interface Segment {
  start: number;
  end: number;
  type: SegmentType;
}

function getAllSegments(shiftStart: number, shiftDuration: number): Segment[] {
  const shiftEnd = shiftStart + shiftDuration;
  const lunchStart = shiftStart + (shiftDuration - LUNCH_DURATION) / 2;
  const lunchEnd = lunchStart + LUNCH_DURATION;

  // Collect all boundary points across the full 12-hour timeline
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(12);
  boundaries.add(shiftStart);
  boundaries.add(shiftEnd);
  boundaries.add(lunchStart);
  boundaries.add(lunchEnd);

  // Add whole-hour boundaries only (drag handles half-hour snapping)
  for (let h = 1; h < 12; h++) boundaries.add(h);

  const sorted = [...boundaries]
    .filter((b) => b >= 0 && b <= 12)
    .sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    let type: SegmentType = "empty";
    if (s >= shiftStart - 0.001 && e <= shiftEnd + 0.001) {
      type = s >= lunchStart - 0.001 && e <= lunchEnd + 0.001 ? "lunch" : "active";
    }
    segments.push({ start: s, end: e, type });
  }

  return segments;
}

interface AgentShiftBlockProps {
  agent: Agent;
  totalWidth: number;
}

export default function AgentShiftBlock({ agent, totalWidth }: AgentShiftBlockProps) {
  const { dispatch } = useAppContext();
  const [dragShiftStart, setDragShiftStart] = useState<number | null>(null);
  const startXRef = useRef(0);
  const startShiftRef = useRef(0);

  const hoursTotal = 12;
  const pixelsPerHour = totalWidth / hoursTotal;

  const effectiveShiftStart = dragShiftStart ?? agent.shiftStart;

  const specialistQueues = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
  const primaryQueue = specialistQueues[0] ?? agent.queues[0];
  const color = QUEUE_COLORS[primaryQueue];

  const segments = useMemo(
    () => getAllSegments(effectiveShiftStart, agent.shiftDuration),
    [effectiveShiftStart, agent.shiftDuration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startShiftRef.current = agent.shiftStart;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startXRef.current;
        const deltaHours = deltaX / pixelsPerHour;
        const newStart = Math.round((startShiftRef.current + deltaHours) * 2) / 2;
        const clamped = Math.max(0, Math.min(MAX_SHIFT_START, newStart));
        setDragShiftStart(clamped);
      };

      const handleMouseUp = (e: MouseEvent) => {
        const deltaX = e.clientX - startXRef.current;
        const deltaHours = deltaX / pixelsPerHour;
        const newStart = Math.round((startShiftRef.current + deltaHours) * 2) / 2;
        const clamped = Math.max(0, Math.min(MAX_SHIFT_START, newStart));

        dispatch({ type: "MOVE_AGENT", agentId: agent.id, shiftStart: clamped });
        setDragShiftStart(null);

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
      className={`absolute inset-y-1 inset-x-0 flex gap-[2px] cursor-grab select-none ${
        dragShiftStart != null ? "cursor-grabbing z-20" : ""
      }`}
      onMouseDown={handleMouseDown}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`h-full rounded-sm flex items-center justify-center text-[10px] font-semibold overflow-hidden ${
            seg.type === "lunch"
              ? "text-gray-300"
              : seg.type === "empty"
                ? ""
                : ""
          }`}
          style={{
            flex: `${seg.end - seg.start}`,
            backgroundColor:
              seg.type === "active"
                ? color
                : seg.type === "lunch"
                  ? "#374151"
                  : "rgba(30, 41, 59, 0.5)",
          }}
        >
          {seg.type === "lunch" && "Lunch"}
        </div>
      ))}
    </div>
  );
}
