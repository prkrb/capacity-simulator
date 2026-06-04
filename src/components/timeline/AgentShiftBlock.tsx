import { useRef, useState, useCallback } from "react";
import type { Agent } from "../../types";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, MAX_SHIFT_START, SHIFT_DURATION } from "../../utils/defaults";
import { useAppContext } from "../../context/AppContext";

interface AgentShiftBlockProps {
  agent: Agent;
  totalWidth: number; // width of the timeline area in pixels
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
  const label = specialistQueues.length <= 1
    ? QUEUE_SHORT_LABELS[primaryQueue]
    : `${QUEUE_SHORT_LABELS[primaryQueue]}+${specialistQueues.length - 1}`;

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
      className={`absolute top-0.5 bottom-0.5 rounded cursor-grab select-none flex items-center justify-center text-xs font-bold text-white/90 transition-shadow ${
        isDragging ? "shadow-lg shadow-black/50 cursor-grabbing z-20 ring-2 ring-white/30" : "hover:brightness-110"
      }`}
      style={{
        left: `${leftPercent + dragOffset}%`,
        width: `${blockWidthPercent}%`,
        backgroundColor: color,
      }}
      onMouseDown={handleMouseDown}
    >
      {label}
    </div>
  );
}
