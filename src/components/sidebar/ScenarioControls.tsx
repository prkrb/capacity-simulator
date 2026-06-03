import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { createDefaultAgents } from "../../utils/defaults";
import { exportAgentScheduleCSV, downloadCSV } from "../../utils/csvParser";

export default function ScenarioControls() {
  const { state, dispatch } = useAppContext();
  const [scenarioName, setScenarioName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const handleSave = () => {
    if (!scenarioName.trim()) return;
    dispatch({ type: "SAVE_SCENARIO", name: scenarioName.trim() });
    setScenarioName("");
    setShowSave(false);
  };

  const handleLoad = (name: string) => {
    dispatch({ type: "LOAD_SCENARIO", name });
  };

  const handleDelete = (name: string) => {
    dispatch({ type: "DELETE_SCENARIO", name });
  };

  const handleReset = () => {
    dispatch({ type: "RESET", defaultAgents: createDefaultAgents() });
  };

  const handleExport = () => {
    downloadCSV(exportAgentScheduleCSV(state.agents), "agent-schedule.csv");
  };

  const scenarioNames = Object.keys(state.scenarios);

  return (
    <div className="px-3 py-3 border-t border-gray-700">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Scenarios
      </h3>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={handleReset}
            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1.5 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => setShowSave(!showSave)}
            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1.5 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleExport}
            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1.5 transition-colors"
          >
            Export
          </button>
        </div>

        {showSave && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Scenario name..."
              className="flex-1 bg-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-600 placeholder-gray-500"
            />
            <button
              onClick={handleSave}
              disabled={!scenarioName.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-1.5 transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {scenarioNames.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-xs text-gray-500">Saved:</span>
            {scenarioNames.map((name) => (
              <div key={name} className="flex items-center gap-1.5 group">
                <button
                  onClick={() => handleLoad(name)}
                  className="flex-1 text-left text-xs text-gray-400 hover:text-gray-200 truncate transition-colors"
                >
                  {name}
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
