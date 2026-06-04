import { createContext, useContext, useReducer, useMemo } from "react";
import type { ReactNode } from "react";
import type { AppState, CapacitySlot } from "../types";
import type { AppAction } from "./appReducer";
import { appReducer } from "./appReducer";
import { createDefaultAgents, DEFAULT_QUEUE_WEIGHTS } from "../utils/defaults";
import { sampleVolumeData } from "../data/sampleVolume";
import { calculateCapacity } from "../utils/capacityCalc";

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  capacityData: CapacitySlot[];
}

const AppContext = createContext<AppContextValue | null>(null);

function loadSavedScenarios(): Record<string, any> {
  try {
    const saved = localStorage.getItem("capacity-scenarios");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

const initialState: AppState = {
  agents: createDefaultAgents(),
  volumeData: sampleVolumeData,
  queueWeights: { ...DEFAULT_QUEUE_WEIGHTS },
  scenarios: loadSavedScenarios(),
  ui: {
    sidebarCollapsed: false,
    panels: [{ view: "timeline" }],
    splitRatio: 50,
    activePanel: 0,
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const capacityData = useMemo(
    () => calculateCapacity(state.agents, state.volumeData, state.queueWeights),
    [state.agents, state.volumeData, state.queueWeights]
  );

  const value = useMemo(
    () => ({ state, dispatch, capacityData }),
    [state, capacityData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
