import { useState, useEffect } from "react";
import { ALL_QUEUES } from "../types";
import type { VolumeEntry } from "../types";
import { useAppContext } from "../context/AppContext";
import { HOUR_LABELS, QUEUE_COLORS, QUEUE_SHORT_LABELS } from "../utils/defaults";

interface SimulateDataModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SimulateDataModal({ open, onClose }: SimulateDataModalProps) {
  const { state, dispatch } = useAppContext();

  // 12 rows (hours) x 6 columns (queues) grid of numbers
  const [grid, setGrid] = useState<number[][]>(() => createEmptyGrid());

  // Re-initialize grid from current volume data when modal opens
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
  }, [open, state.volumeData]);

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
    onClose();
  };

  const handleClear = () => {
    setGrid(createEmptyGrid());
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
        className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-200">Simulate Data</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter call volume per queue per hour</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Grid */}
        <div className="px-5 py-4 overflow-x-auto">
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
