import type { Agent } from "../../types";
import { ALL_QUEUES } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, formatTime } from "../../utils/defaults";

interface AgentTokenProps {
  agent: Agent;
}

export default function AgentToken({ agent }: AgentTokenProps) {
  const { dispatch } = useAppContext();

  const handleDelete = () => {
    dispatch({ type: "DELETE_AGENT", agentId: agent.id });
  };

  const shiftEnd = agent.shiftStart + agent.shiftDuration;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-700/50 rounded text-sm group">
      <span className="text-gray-300 w-10 shrink-0 font-mono text-[10px]">
        {agent.id.replace("agent-", "A")}
      </span>
      <div className="flex gap-0.5 shrink-0">
        {ALL_QUEUES.map((q) => {
          const isActive = agent.queues.includes(q);
          return (
            <button
              key={q}
              onClick={() => dispatch({ type: "TOGGLE_AGENT_QUEUE", agentId: agent.id, queue: q })}
              className={`text-[8px] font-bold px-1 py-0.5 rounded transition-colors ${
                isActive
                  ? "text-white"
                  : "text-gray-600 bg-gray-800 hover:text-gray-400"
              }`}
              style={isActive ? { backgroundColor: QUEUE_COLORS[q] } : undefined}
              title={q}
            >
              {QUEUE_SHORT_LABELS[q]}
            </button>
          );
        })}
      </div>
      <span className="text-gray-500 text-[10px] shrink-0">
        {formatTime(agent.shiftStart)}–{formatTime(shiftEnd)}
      </span>
      <button
        onClick={handleDelete}
        className="ml-auto text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        title="Delete agent"
      >
        ✕
      </button>
    </div>
  );
}
