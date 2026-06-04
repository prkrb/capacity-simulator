import type { Agent } from "../../types";
import { ALL_QUEUES } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS } from "../../utils/defaults";
import { SHIFT_SLOTS } from "../../utils/shifts";

interface AgentTokenProps {
  agent: Agent;
}

export default function AgentToken({ agent }: AgentTokenProps) {
  const { dispatch } = useAppContext();

  const handleDelete = () => {
    dispatch({ type: "DELETE_AGENT", agentId: agent.id });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 rounded group">
      {/* Agent ID */}
      <span className="text-gray-300 w-10 shrink-0 font-mono text-xs font-semibold">
        {agent.id.replace("agent-", "A")}
      </span>

      {/* Lock button */}
      <button
        onClick={() => dispatch({ type: "TOGGLE_AGENT_LOCK", agentId: agent.id })}
        className={`shrink-0 text-sm w-5 text-center transition-colors ${
          agent.locked
            ? "text-amber-400"
            : "text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100"
        }`}
        title={agent.locked ? "Unlock (optimizer can change)" : "Lock (optimizer will skip)"}
      >
        {agent.locked ? "\u{1F512}" : "\u{1F513}"}
      </button>

      {/* Queue badges */}
      <div className="flex gap-1 shrink-0">
        {ALL_QUEUES.map((q) => {
          const isActive = agent.queues.includes(q);
          return (
            <button
              key={q}
              onClick={() => dispatch({ type: "TOGGLE_AGENT_QUEUE", agentId: agent.id, queue: q })}
              className={`text-[10px] font-bold px-1.5 py-1 rounded transition-colors ${
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

      {/* Shift dropdown */}
      <select
        value={agent.shiftStart}
        onChange={(e) =>
          dispatch({ type: "MOVE_AGENT", agentId: agent.id, shiftStart: parseFloat(e.target.value) })
        }
        className="bg-gray-800 text-gray-400 text-xs rounded border border-gray-700 px-1.5 py-1 focus:border-blue-500 focus:outline-none cursor-pointer shrink-0"
      >
        {SHIFT_SLOTS.map((slot) => (
          <option key={slot.shiftStart} value={slot.shiftStart}>
            {slot.label}
          </option>
        ))}
      </select>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="ml-auto text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"
        title="Delete agent"
      >
        ✕
      </button>
    </div>
  );
}
