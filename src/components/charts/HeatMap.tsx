import { ALL_QUEUES } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, HOUR_LABELS, QUEUES_PER_AGENT } from "../../utils/defaults";

function deltaToColor(delta: number): string {
  // Neutral dark base for zero
  const neutral = { r: 30, g: 34, b: 42 };

  if (delta >= 0) {
    // Emerald/teal green: neutral -> #10b981
    const t = Math.min(delta / 8, 1);
    return `rgb(${lerp(neutral.r, 16, t)}, ${lerp(neutral.g, 185, t)}, ${lerp(neutral.b, 129, t)})`;
  } else {
    // Rose/coral red: neutral -> #f43f5e
    const t = Math.min(Math.abs(delta) / 8, 1);
    return `rgb(${lerp(neutral.r, 244, t)}, ${lerp(neutral.g, 63, t)}, ${lerp(neutral.b, 94, t)})`;
  }
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export default function HeatMap() {
  const { state, capacityData } = useAppContext();
  const callsPerHour = state.agents[0]?.callsPerHour ?? 2;
  const perAgent = callsPerHour / QUEUES_PER_AGENT;

  // Build lookup: queue -> hour -> slot
  const lookup = new Map<string, { delta: number; capacity: number; volume: number }>();
  for (const slot of capacityData) {
    lookup.set(`${slot.queue}-${slot.hour}`, slot);
  }

  return (
    <div className="p-3">
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header row */}
        <div
          className="grid border-b border-gray-700"
          style={{ gridTemplateColumns: "140px repeat(12, 1fr)" }}
        >
          <div className="px-3 py-2" />
          {HOUR_LABELS.map((label) => (
            <div
              key={label}
              className="px-1 py-2 text-center text-[10px] font-medium text-gray-400 border-l border-gray-700/50"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Queue rows */}
        {ALL_QUEUES.map((queue) => (
          <div
            key={queue}
            className="grid border-b border-gray-700/50 last:border-b-0"
            style={{ gridTemplateColumns: "140px repeat(12, 1fr)" }}
          >
            {/* Row label */}
            <div className="px-3 py-3 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: QUEUE_COLORS[queue] }}
              />
              <span
                className="text-xs font-semibold truncate"
                style={{ color: QUEUE_COLORS[queue] }}
              >
                {queue}
              </span>
            </div>

            {/* Hour cells */}
            {Array.from({ length: 12 }, (_, hour) => {
              const slot = lookup.get(`${queue}-${hour}`);
              const delta = slot?.delta ?? 0;
              const agentDelta = delta < 0
                ? -Math.ceil(Math.abs(delta) / perAgent)
                : Math.floor(delta / perAgent);

              return (
                <div
                  key={hour}
                  className="border-l border-gray-700/50 flex items-center justify-center relative group"
                  style={{ backgroundColor: deltaToColor(delta) }}
                >
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "#ffffff" }}
                  >
                    {agentDelta === 0 ? "✓" : agentDelta > 0 ? `+${agentDelta}` : agentDelta}
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                      <div className="text-gray-300 font-medium">{queue} — {HOUR_LABELS[hour]}</div>
                      <div className="text-gray-400">
                        Cap: {slot?.capacity.toFixed(1) ?? 0} | Vol: {slot?.volume ?? 0}
                      </div>
                      <div style={{ color: delta >= 0 ? "#4ade80" : "#f87171" }}>
                        Delta: {delta >= 0 ? "+" : ""}{delta.toFixed(1)} ({agentDelta >= 0 ? "+" : ""}{agentDelta} agents)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: deltaToColor(-10) }} />
          <span>Deficit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: deltaToColor(-3) }} />
          <span>Slight deficit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: deltaToColor(0) }} />
          <span>Balanced</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: deltaToColor(3) }} />
          <span>Slight surplus</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: deltaToColor(10) }} />
          <span>Surplus</span>
        </div>
      </div>
    </div>
  );
}
