import TopSummaryBar from "./components/TopSummaryBar";
import AgentRoster from "./components/sidebar/AgentRoster";
import CSVUploader from "./components/sidebar/CSVUploader";
import ScenarioControls from "./components/sidebar/ScenarioControls";
import TimelineGrid from "./components/timeline/TimelineGrid";
import ChartsPanel from "./components/charts/ChartsPanel";
import { useAppContext } from "./context/AppContext";

function App() {
  const { state, dispatch } = useAppContext();
  const { sidebarCollapsed } = state.ui;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <TopSummaryBar />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className="bg-gray-850 border-r border-gray-700 flex flex-col shrink-0 transition-all duration-200"
          style={{
            backgroundColor: "#1a1d27",
            width: sidebarCollapsed ? 0 : 345,
            overflow: sidebarCollapsed ? "hidden" : undefined,
          }}
        >
          <CSVUploader />
          <AgentRoster />
          <ScenarioControls />
        </aside>

        {/* Toggle sidebar button */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          className="w-5 shrink-0 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-300 border-r border-gray-700 transition-colors"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarCollapsed ? ">" : "<"}
        </button>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Timeline */}
          <div className="flex-1 min-h-0 p-3 overflow-auto">
            <TimelineGrid />
          </div>

          {/* Charts */}
          <div className="border-t border-gray-700 overflow-auto" style={{ maxHeight: "45vh" }}>
            <ChartsPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
