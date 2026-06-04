import { useState } from "react";
import type { Agent } from "../../types";
import { QUEUE_COLORS } from "../../utils/defaults";

interface ShiftAgentChipProps {
  agent: Agent;
}

export default function ShiftAgentChip({ agent }: ShiftAgentChipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const color = QUEUE_COLORS[agent.specialistQueue];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("agentId", agent.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100 hover:brightness-125"
      }`}
      style={{ backgroundColor: color }}
    >
      {agent.id.replace("agent-", "Agent ")}
    </div>
  );
}
