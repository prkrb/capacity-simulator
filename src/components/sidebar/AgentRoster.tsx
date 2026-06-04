import { useAppContext } from "../../context/AppContext";
import { createAgent, DEFAULT_QUEUES } from "../../utils/defaults";
import AgentToken from "./AgentToken";

export default function AgentRoster() {
  const { state, dispatch } = useAppContext();
  const { agents } = state;

  const handleAddAgent = () => {
    const nextNum = agents.length + 1;
    const agent = createAgent(nextNum, DEFAULT_QUEUES, 1);
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
      {agents.map((agent) => (
        <AgentToken key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
