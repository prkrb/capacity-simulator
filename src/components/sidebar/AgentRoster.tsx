import { useAppContext } from "../../context/AppContext";
import { SPECIALIST_QUEUES } from "../../types";
import { QUEUE_COLORS, createAgent } from "../../utils/defaults";
import AgentToken from "./AgentToken";

export default function AgentRoster() {
  const { state, dispatch } = useAppContext();
  const { agents } = state;

  const handleAddAgent = () => {
    const nextNum = agents.length + 1;
    const agent = createAgent(nextNum, "Tech", 1);
    // Ensure unique ID
    const existingIds = new Set(agents.map((a) => a.id));
    let id = agent.id;
    let counter = nextNum;
    while (existingIds.has(id)) {
      counter++;
      id = `agent-${counter.toString().padStart(2, "0")}`;
    }
    agent.id = id;
    dispatch({ type: "ADD_AGENT", agent });
  };

  const grouped = SPECIALIST_QUEUES.map((queue) => ({
    queue,
    agents: agents.filter((a) => a.specialistQueue === queue),
  }));

  return (
    <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Agents ({agents.length})
        </h3>
        <button
          onClick={handleAddAgent}
          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
        >
          + Add
        </button>
      </div>
      {grouped.map(({ queue, agents: queueAgents }) => (
        <div key={queue}>
          <div
            className="flex items-center gap-2 px-3 py-1 text-xs font-medium"
            style={{ color: QUEUE_COLORS[queue] }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: QUEUE_COLORS[queue] }}
            />
            {queue} ({queueAgents.length})
          </div>
          {queueAgents.map((agent) => (
            <AgentToken key={agent.id} agent={agent} />
          ))}
        </div>
      ))}
    </div>
  );
}
