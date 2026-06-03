import type { Agent, QueueName } from "../../types";
import { QUEUE_COLORS } from "../../utils/defaults";
import AgentShiftBlock from "./AgentShiftBlock";

interface QueueGroupRowProps {
  queue: QueueName;
  agents: Agent[];
  timelineWidth: number;
}

export default function QueueGroupRow({ queue, agents, timelineWidth }: QueueGroupRowProps) {
  return (
    <div>
      <div className="flex items-center border-b border-gray-700/50">
        <div className="w-20 shrink-0 px-2 py-1">
          <span
            className="text-xs font-semibold"
            style={{ color: QUEUE_COLORS[queue] }}
          >
            {queue}
          </span>
        </div>
        <div className="flex-1" />
      </div>
      {agents.map((agent) => (
        <div key={agent.id} className="flex border-b border-gray-800/50">
          <div className="w-20 shrink-0 px-2 py-0.5 text-xs text-gray-500 flex items-center font-mono">
            {agent.id.replace("agent-", "#")}
          </div>
          <div className="flex-1 relative h-7">
            {/* Hour grid lines */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-gray-800/50"
                style={{ left: `${(i / 12) * 100}%` }}
              />
            ))}
            <AgentShiftBlock agent={agent} totalWidth={timelineWidth} />
          </div>
        </div>
      ))}
    </div>
  );
}
