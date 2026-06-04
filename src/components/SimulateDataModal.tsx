import { useState, useEffect } from "react";
import { ALL_QUEUES } from "../types";
import type { QueueName, VolumeEntry } from "../types";
import { useAppContext } from "../context/AppContext";
import { HOUR_LABELS, QUEUE_COLORS, QUEUE_SHORT_LABELS } from "../utils/defaults";

interface SimulateDataModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SimulateDataModal({ open, onClose }: SimulateDataModalProps) {
  const { state, dispatch } = useAppContext();

  const [grid, setGrid] = useState<number[][]>(() => createEmptyGrid());
  const [dailyVolumes, setDailyVolumes] = useState<number[]>(() => Array(ALL_QUEUES.length).fill(0));
  const [callsPerDay, setCallsPerDay] = useState(state.agents[0]?.callsPerDay ?? 16);
  const [shiftDuration, setShiftDuration] = useState(state.agents[0]?.shiftDuration ?? 8.5);
  const [weights, setWeights] = useState<Record<QueueName, number>>(() => ({ ...state.queueWeights }));

  useEffect(() => {
    if (!open) return;
    const newGrid = createEmptyGrid();
    for (const entry of state.volumeData) {
      const colIdx = ALL_QUEUES.indexOf(entry.queue);
      if (entry.hour >= 0 && entry.hour < 12 && colIdx >= 0) {
        newGrid[entry.hour][colIdx] = entry.calls;
      }
    }
    setGrid(newGrid);
    // Initialize daily volumes from current column totals
    setDailyVolumes(ALL_QUEUES.map((_, col) =>
      newGrid.reduce((sum, row) => sum + row[col], 0)
    ));
    setCallsPerDay(state.agents[0]?.callsPerDay ?? 16);
    setShiftDuration(state.agents[0]?.shiftDuration ?? 8.5);
    setWeights({ ...state.queueWeights });
  }, [open, state.volumeData, state.agents, state.queueWeights]);

  if (!open) return null;

  function createEmptyGrid(): number[][] {
    return Array.from({ length: 12 }, () => Array(ALL_QUEUES.length).fill(0));
  }

  const handleCellChange = (hour: number, col: number, value: string) => {
    const num = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[hour][col] = num;
      return next;
    });
    // Update daily volume to match new column total
    setDailyVolumes((prev) => {
      const next = [...prev];
      next[col] = grid.reduce((sum, row, h) => sum + (h === hour ? num : row[col]), 0);
      return next;
    });
  };

  const handleDailyVolumeChange = (col: number, value: string) => {
    const total = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(total) || total < 0) return;

    setDailyVolumes((prev) => {
      const next = [...prev];
      next[col] = total;
      return next;
    });

    // Spread evenly across 12 hours
    const perHour = Math.floor(total / 12);
    const remainder = total % 12;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      for (let h = 0; h < 12; h++) {
        next[h][col] = perHour + (h < remainder ? 1 : 0);
      }
      return next;
    });
  };

  const handleApply = () => {
    const data: VolumeEntry[] = [];
    for (let hour = 0; hour < 12; hour++) {
      for (let col = 0; col < ALL_QUEUES.length; col++) {
        const calls = grid[hour][col];
        if (calls > 0) {
          data.push({ hour, queue: ALL_QUEUES[col], calls });
        }
      }
    }
    dispatch({ type: "SET_VOLUME_DATA", data });
    if (callsPerDay !== (state.agents[0]?.callsPerDay ?? 16)) {
      dispatch({ type: "SET_CALLS_PER_DAY", callsPerDay });
    }
    dispatch({ type: "SET_QUEUE_WEIGHTS", weights });
    onClose();
  };

  const handleClear = () => {
    setGrid(createEmptyGrid());
    setDailyVolumes(Array(ALL_QUEUES.length).fill(0));
  };

  // Calculate totals
  const colTotals = ALL_QUEUES.map((_, col) =>
    grid.reduce((sum, row) => sum + row[col], 0)
  );
  const rowTotals = grid.map((row) => row.reduce((sum, v) => sum + v, 0));
  const grandTotal = colTotals.reduce((sum, v) => sum + v, 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-200">Simulate Data</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter daily volume to auto-spread, or edit individual hours</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-0">
          {/* Left: Volume Grid */}
          <div className="flex-1 px-5 py-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2 py-2 w-20">
                    Hour
                  </th>
                  {ALL_QUEUES.map((queue) => (
                    <th
                      key={queue}
                      className="text-center text-[10px] uppercase tracking-wider font-bold px-1 py-2"
                      style={{ color: QUEUE_COLORS[queue] }}
                    >
                      {QUEUE_SHORT_LABELS[queue]}
                    </th>
                  ))}
                  <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2 py-2">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Daily Volume row */}
                <tr className="border-t-2 border-blue-500/30 bg-blue-500/5">
                  <td className="text-xs text-blue-400 font-bold px-2 py-1.5">
                    Daily Vol
                  </td>
                  {dailyVolumes.map((value, col) => (
                    <td key={col} className="px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        value={value || ""}
                        onChange={(e) => handleDailyVolumeChange(col, e.target.value)}
                        placeholder="0"
                        className="w-full bg-blue-900/30 text-blue-300 text-sm text-center rounded px-1.5 py-1.5 border border-blue-500/30 focus:border-blue-500 focus:outline-none placeholder-blue-800 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className="text-xs text-blue-400 text-center font-bold px-2 py-1.5">
                    {dailyVolumes.reduce((s, v) => s + v, 0)}
                  </td>
                </tr>

                {/* Separator */}
                <tr>
                  <td colSpan={ALL_QUEUES.length + 2} className="h-1" />
                </tr>

                {/* Hourly rows */}
                {grid.map((row, hour) => (
                  <tr key={hour} className="border-t border-gray-700/50">
                    <td className="text-xs text-gray-400 font-medium px-2 py-1.5">
                      {HOUR_LABELS[hour]}
                    </td>
                    {row.map((value, col) => (
                      <td key={col} className="px-1 py-1">
                        <input
                          type="number"
                          min={0}
                          value={value || ""}
                          onChange={(e) => handleCellChange(hour, col, e.target.value)}
                          placeholder="0"
                          className="w-full bg-gray-700 text-gray-200 text-sm text-center rounded px-1.5 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                    ))}
                    <td className="text-xs text-gray-400 text-center font-medium px-2 py-1.5">
                      {rowTotals[hour]}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="border-t-2 border-gray-600">
                  <td className="text-xs text-gray-400 font-bold px-2 py-2">Total</td>
                  {colTotals.map((total, col) => (
                    <td
                      key={col}
                      className="text-xs text-center font-bold px-1 py-2"
                      style={{ color: QUEUE_COLORS[ALL_QUEUES[col]] }}
                    >
                      {total}
                    </td>
                  ))}
                  <td className="text-xs text-gray-200 text-center font-bold px-2 py-2">
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Capacity Assumptions */}
          <div className="w-52 shrink-0 border-l border-gray-700 px-4 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Assumptions
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
                  Calls / Day / Agent
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={callsPerDay}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) setCallsPerDay(val);
                  }}
                  className="w-full bg-gray-700 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
                  Shift Duration (hrs)
                </label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  step={0.5}
                  value={shiftDuration}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 4 && val <= 12) setShiftDuration(val);
                  }}
                  className="w-full bg-gray-700 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
                  Total Agents
                </label>
                <div className="text-sm text-gray-300 font-semibold px-2 py-1.5">
                  {state.agents.length}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
                  Lunch Break
                </label>
                <div className="text-sm text-gray-300 font-semibold px-2 py-1.5">
                  30 min
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
                  Operational Window
                </label>
                <div className="text-sm text-gray-300 font-semibold px-2 py-1.5">
                  5:00 AM – 5:00 PM
                </div>
              </div>

              {/* Queue Focus */}
              <div className="border-t border-gray-700 pt-3 mt-1">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
                  Queue Weight
                </h4>
                <p className="text-[9px] text-gray-600 mb-2">
                  Relative priority per queue. Splits are normalized across each agent's assigned queues.
                </p>
                <div className="flex flex-col gap-1.5">
                  {ALL_QUEUES.map((queue) => {
                    const w = weights[queue] ?? 1;
                    // Show effective % assuming agent has this queue + Config + Password (typical 3-queue agent)
                    const typicalQueues: QueueName[] = ["Config / Other", "Password"];
                    if (!typicalQueues.includes(queue)) typicalQueues.push(queue);
                    const sumW = typicalQueues.reduce((s, q) => s + (weights[q] ?? 1), 0);
                    const effectivePct = sumW > 0 ? Math.round((w / sumW) * 100) : 0;
                    return (
                      <div key={queue} className="flex items-center gap-1.5">
                        <span
                          className="text-[9px] font-bold w-8 shrink-0"
                          style={{ color: QUEUE_COLORS[queue] }}
                        >
                          {QUEUE_SHORT_LABELS[queue]}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={w}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 100) setWeights((prev) => ({ ...prev, [queue]: val }));
                          }}
                          className="w-12 bg-gray-700 text-gray-200 text-sm text-center rounded px-1 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-gray-400 font-medium ml-auto">
                          {effectivePct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick summary */}
              <div className="border-t border-gray-700 pt-3 mt-1">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
                  Quick Stats
                </h4>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Daily Volume</span>
                    <span className="text-gray-300 font-medium">{grandTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg/Hr</span>
                    <span className="text-gray-300 font-medium">{grandTotal > 0 ? (grandTotal / 12).toFixed(1) : "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity/Agent/Day</span>
                    <span className="text-gray-300 font-medium">{callsPerDay}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear All
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg px-4 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
