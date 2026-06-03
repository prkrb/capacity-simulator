import type { Agent, QueueName } from "../../types";
import { SPECIALIST_QUEUES } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, QUEUE_SHORT_LABELS, formatTime } from "../../utils/defaults";

interface AgentTokenProps {
  agent: Agent;
}

export default function AgentToken({ agent }: AgentTokenProps) {
  const { dispatch } = useAppContext();

  const handleQueueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: "UPDATE_AGENT",
      agentId: agent.id,
      updates: { specialistQueue: e.target.value as QueueName },
    });
  };

  const handleDelete = () => {
    dispatch({ type: "DELETE_AGENT", agentId: agent.id });
  };

  const color = QUEUE_COLORS[agent.specialistQueue];
  const shiftEnd = agent.shiftStart + agent.shiftDuration;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/50 rounded text-sm group">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-300 w-16 shrink-0 font-mono text-xs">
        {agent.id.replace("agent-", "Agent ")}
      </span>
      <select
        value={agent.specialistQueue}
        onChange={handleQueueChange}
        className="bg-gray-700 text-gray-300 text-xs rounded px-1.5 py-0.5 border border-gray-600 w-20 shrink-0"
      >
        {SPECIALIST_QUEUES.map((q) => (
          <option key={q} value={q}>
            {QUEUE_SHORT_LABELS[q]}
          </option>
        ))}
      </select>
      <span className="text-gray-500 text-xs shrink-0">
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
