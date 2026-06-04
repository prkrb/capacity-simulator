import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import type { QueueName } from "../../types";
import { useCapacityForQueue, useDailyStats } from "../../hooks/useCapacityCalculator";
import { useAppContext } from "../../context/AppContext";
import { QUEUE_COLORS, HOUR_LABELS } from "../../utils/defaults";

interface QueueChartProps {
  queue: QueueName;
}

export default function QueueChart({ queue }: QueueChartProps) {
  const { state } = useAppContext();
  const data = useCapacityForQueue(queue);
  const stats = useDailyStats(queue);
  const color = QUEUE_COLORS[queue];
  const callsPerDay = state.agents[0]?.callsPerDay ?? 16;
  const effectiveHours = (state.agents[0]?.shiftDuration ?? 8.5) - 0.5;
  const perAgent = (callsPerDay / effectiveHours) / 3;

  const chartData = data.map((slot) => {
    const delta = Math.round(slot.delta * 10) / 10;
    const agentDelta = delta < 0
      ? -Math.ceil(Math.abs(delta) / perAgent)
      : Math.floor(delta / perAgent);
    return {
      name: HOUR_LABELS[slot.hour],
      volume: slot.volume,
      capacity: Math.round(slot.capacity * 10) / 10,
      delta,
      agentDelta,
      label: agentDelta >= 0 ? `+${agentDelta}` : `${agentDelta}`,
    };
  });

  const deltaColor = stats.totalDelta >= 0 ? "#4ade80" : "#f87171";

  const renderBarLabel = (props: any) => {
    const { x, y, width, index } = props;
    const entry = chartData[index];
    if (!entry) return null;
    const isPositive = entry.agentDelta >= 0;
    return (
      <text
        x={x + width / 2}
        y={y + 12}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill={isPositive ? "#4ade80" : "#f87171"}
      >
        {entry.label}
      </text>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-gray-200">{queue}</span>
          {stats.agentsNeeded > 0 ? (
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5 font-medium">
              +{stats.agentsNeeded} agent{stats.agentsNeeded !== 1 ? "s" : ""} needed
            </span>
          ) : (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1.5 py-0.5 font-medium">
              Covered
            </span>
          )}
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-gray-400">
            Cap: <span className="text-gray-200">{stats.totalCapacity.toFixed(1)}</span>
          </span>
          <span className="text-gray-400">
            Vol: <span className="text-gray-200">{stats.totalVolume}</span>
          </span>
          <span style={{ color: deltaColor }}>
            {stats.totalDelta >= 0 ? "+" : ""}{stats.totalDelta.toFixed(1)}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={chartData} margin={{ top: 14, right: 5, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            fill={`${color}20`}
            stroke={color}
            strokeWidth={2}
            name="Volume"
          />
          <Bar dataKey="capacity" name="Capacity" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.delta >= 0 ? "#4ade8060" : "#f8717160"}
                stroke={entry.delta >= 0 ? "#4ade80" : "#f87171"}
                strokeWidth={1}
              />
            ))}
            <LabelList dataKey="label" content={renderBarLabel} />
          </Bar>
          <ReferenceLine y={0} stroke="#374151" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
