import { useRef, useCallback, useEffect, useState } from "react";
import TopSummaryBar from "./components/TopSummaryBar";
import AgentRoster from "./components/sidebar/AgentRoster";
import TimelineGrid from "./components/timeline/TimelineGrid";
import ShiftView from "./components/shiftview/ShiftView";
import ChartsPanel from "./components/charts/ChartsPanel";
import HeatMap from "./components/charts/HeatMap";
import { useAppContext } from "./context/AppContext";
import type { PanelView } from "./types";

const VIEW_LABELS: { view: PanelView; label: string }[] = [
  { view: "timeline", label: "Timeline" },
  { view: "shifts", label: "Shifts" },
  { view: "charts", label: "Charts" },
  { view: "heatmap", label: "Heat Map" },
];

function PanelContent({ view }: { view: PanelView }) {
  switch (view) {
    case "timeline":
      return <TimelineGrid />;
    case "shifts":
      return <ShiftView />;
    case "charts":
      return <ChartsPanel />;
    case "heatmap":
      return <HeatMap />;
  }
}

function App() {
  const { state, dispatch } = useAppContext();
  const { sidebarCollapsed, panels, splitRatio, activePanel } = state.ui;
  const isSplit = panels.length > 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientY - rect.top) / rect.height) * 100;
      dispatch({ type: "SET_SPLIT_RATIO", ratio: Math.max(20, Math.min(80, ratio)) });
    },
    [dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleTabClick = (view: PanelView) => {
    dispatch({ type: "SET_PANEL_VIEW", panel: activePanel, view });
  };

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
          <AgentRoster />
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
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-1">
            {VIEW_LABELS.map(({ view, label }) => {
              const inPanel0 = panels[0]?.view === view;
              const inPanel1 = panels[1]?.view === view;
              const isActive = inPanel0 || inPanel1;
              const panelIndicator =
                isSplit && isActive
                  ? inPanel0
                    ? " (1)"
                    : " (2)"
                  : "";
              return (
                <button
                  key={view}
                  onClick={() => handleTabClick(view)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  {label}
                  {panelIndicator && (
                    <span className="text-[10px] text-gray-400 ml-1">{panelIndicator}</span>
                  )}
                </button>
              );
            })}

            <div className="flex-1" />

            {/* Split toggle */}
            <button
              onClick={() => dispatch({ type: "TOGGLE_SPLIT" })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isSplit
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700"
              }`}
            >
              {isSplit ? "Unsplit" : "Split View"}
            </button>
          </div>

          {/* Panels */}
          <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
            {isSplit ? (
              <>
                {/* Panel 1 */}
                <div
                  className={`overflow-auto px-3 pb-1 ${
                    activePanel === 0 ? "ring-1 ring-blue-500/30 rounded-lg mx-2 mt-1" : "mx-2 mt-1"
                  }`}
                  style={{ height: `${splitRatio}%` }}
                  onClick={() => dispatch({ type: "SET_ACTIVE_PANEL", panel: 0 })}
                >
                  <PanelContent view={panels[0].view} />
                </div>

                {/* Drag handle */}
                <div
                  className="h-2 shrink-0 flex items-center justify-center cursor-row-resize group hover:bg-gray-700/50 mx-2"
                  onMouseDown={() => setDragging(true)}
                >
                  <div className="w-12 h-0.5 bg-gray-600 rounded group-hover:bg-blue-500 transition-colors" />
                </div>

                {/* Panel 2 */}
                <div
                  className={`overflow-auto px-3 pt-1 pb-3 flex-1 ${
                    activePanel === 1 ? "ring-1 ring-blue-500/30 rounded-lg mx-2 mb-1" : "mx-2 mb-1"
                  }`}
                  onClick={() => dispatch({ type: "SET_ACTIVE_PANEL", panel: 1 })}
                >
                  <PanelContent view={panels[1].view} />
                </div>
              </>
            ) : (
              /* Single panel */
              <div className="flex-1 min-h-0 px-3 pb-3 overflow-auto">
                <PanelContent view={panels[0].view} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
