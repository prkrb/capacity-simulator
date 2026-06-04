import { useAppContext } from "../../context/AppContext";
import { SPECIALIST_QUEUES } from "../../types";
import { QUEUE_COLORS } from "../../utils/defaults";
import { SHIFT_SLOTS } from "../../utils/shifts";
import ShiftCell from "./ShiftCell";

export default function ShiftView() {
  const { state } = useAppContext();

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header row: shift time labels */}
      <div className="grid border-b border-gray-700" style={{ gridTemplateColumns: "140px repeat(4, 1fr)" }}>
        <div className="px-3 py-3 flex items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Queue</span>
        </div>
        {SHIFT_SLOTS.map((slot) => {
          const count = state.agents.filter((a) => a.shiftStart === slot.shiftStart).length;
          return (
            <div key={slot.shiftStart} className="px-3 py-3 border-l border-gray-700 text-center">
              <div className="text-sm font-semibold text-gray-200">{slot.label}</div>
              <div className="text-xs text-gray-500">{count} agents</div>
            </div>
          );
        })}
      </div>

      {/* Grid rows: one per specialist queue */}
      {SPECIALIST_QUEUES.map((queue) => (
        <div
          key={queue}
          className="grid border-b border-gray-700/50 last:border-b-0"
          style={{ gridTemplateColumns: "140px repeat(4, 1fr)" }}
        >
          {/* Row label */}
          <div className="px-3 py-3 flex items-start">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: QUEUE_COLORS[queue] }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: QUEUE_COLORS[queue] }}
              >
                {queue}
              </span>
            </div>
          </div>

          {/* Cells: one per shift slot */}
          {SHIFT_SLOTS.map((slot) => {
            const cellAgents = state.agents.filter(
              (a) => a.queues.includes(queue) && a.shiftStart === slot.shiftStart
            );
            return (
              <div key={slot.shiftStart} className="p-1.5 border-l border-gray-700/50">
                <ShiftCell
                  agents={cellAgents}
                  shiftStart={slot.shiftStart}
                  queue={queue}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
