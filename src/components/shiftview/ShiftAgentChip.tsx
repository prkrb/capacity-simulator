import { useState } from "react";
import type { Agent } from "../../types";
import { QUEUE_COLORS } from "../../utils/defaults";

interface ShiftAgentChipProps {
  agent: Agent;
}

export default function ShiftAgentChip({ agent }: ShiftAgentChipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const specialistQueues = agent.queues.filter((q) => q !== "Config / Other" && q !== "Password");
  const primaryQueue = specialistQueues[0] ?? agent.queues[0];
  const color = QUEUE_COLORS[primaryQueue];
  const extraQueues = specialistQueues.slice(1);

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
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100 hover:brightness-125"
      }`}
      style={{ backgroundColor: color }}
    >
      {agent.id.replace("agent-", "A")}
      {extraQueues.length > 0 && (
        <div className="flex gap-px ml-0.5">
          {extraQueues.map((q) => (
            <span
              key={q}
              className="w-1.5 h-1.5 rounded-full border border-white/40"
              style={{ backgroundColor: QUEUE_COLORS[q] }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
