import { HOUR_LABELS } from "../../utils/defaults";

export default function HourHeaders() {
  return (
    <div className="flex border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
      <div className="w-60 shrink-0 px-3 py-2 flex items-center gap-4">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Agent</span>
        <span className="text-[10px] text-gray-600">Shift</span>
        <span className="text-[10px] text-gray-600">Lunch</span>
        <span className="text-[10px] text-gray-600">Queues</span>
      </div>
      {HOUR_LABELS.map((label, i) => (
        <div
          key={i}
          className="flex-1 text-center text-xs text-gray-500 py-2 border-l border-gray-700/50"
        >
          {label}
        </div>
      ))}
    </div>
  );
}
