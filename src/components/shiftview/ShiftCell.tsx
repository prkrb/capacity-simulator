import { useState } from "react";
import type { Agent, QueueName } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS } from "../../utils/defaults";
import ShiftAgentChip from "./ShiftAgentChip";

interface ShiftCellProps {
  agents: Agent[];
  shiftStart: number;
  queue: QueueName;
}

export default function ShiftCell({ agents, shiftStart, queue }: ShiftCellProps) {
  const { state, dispatch } = useAppContext();
  const [isOver, setIsOver] = useState(false);
  const color = QUEUE_COLORS[queue];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const agentId = e.dataTransfer.getData("agentId");
    if (!agentId) return;

    dispatch({ type: "MOVE_AGENT", agentId, shiftStart });

    // Add this queue to the agent if not already present
    const agent = state.agents.find((a) => a.id === agentId);
    if (agent && !agent.queues.includes(queue)) {
      dispatch({ type: "TOGGLE_AGENT_QUEUE", agentId, queue });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-lg border min-h-[80px] p-2 transition-colors ${
        isOver
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800/50"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] font-bold rounded-full px-2 py-0.5"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {agents.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {agents.map((agent) => (
          <ShiftAgentChip key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
