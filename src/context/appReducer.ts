import type { Agent, AppState, Scenario, VolumeEntry } from "../types";

export type AppAction =
  | { type: "SET_AGENTS"; agents: Agent[] }
  | { type: "ADD_AGENT"; agent: Agent }
  | { type: "DELETE_AGENT"; agentId: string }
  | { type: "UPDATE_AGENT"; agentId: string; updates: Partial<Pick<Agent, "specialistQueue" | "shiftStart">> }
  | { type: "MOVE_AGENT"; agentId: string; shiftStart: number }
  | { type: "SET_VOLUME_DATA"; data: VolumeEntry[] }
  | { type: "SAVE_SCENARIO"; name: string }
  | { type: "LOAD_SCENARIO"; name: string }
  | { type: "DELETE_SCENARIO"; name: string }
  | { type: "RESET"; defaultAgents: Agent[] }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_CALLS_PER_HOUR"; callsPerHour: number }
  | { type: "SET_VIEW_MODE"; mode: "timeline" | "shifts" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_AGENTS":
      return { ...state, agents: action.agents };

    case "ADD_AGENT":
      return { ...state, agents: [...state.agents, action.agent] };

    case "DELETE_AGENT":
      return { ...state, agents: state.agents.filter((a) => a.id !== action.agentId) };

    case "UPDATE_AGENT": {
      return {
        ...state,
        agents: state.agents.map((a) => {
          if (a.id !== action.agentId) return a;
          const updated = { ...a, ...action.updates };
          if (action.updates.specialistQueue) {
            updated.queues = ["Config / Other", "Password", action.updates.specialistQueue];
          }
          return updated;
        }),
      };
    }

    case "MOVE_AGENT":
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, shiftStart: action.shiftStart } : a
        ),
      };

    case "SET_VOLUME_DATA":
      return { ...state, volumeData: action.data };

    case "SAVE_SCENARIO": {
      const scenario: Scenario = {
        name: action.name,
        agents: JSON.parse(JSON.stringify(state.agents)),
        timestamp: Date.now(),
      };
      const scenarios = { ...state.scenarios, [action.name]: scenario };
      localStorage.setItem("capacity-scenarios", JSON.stringify(scenarios));
      return { ...state, scenarios };
    }

    case "LOAD_SCENARIO": {
      const scenario = state.scenarios[action.name];
      if (!scenario) return state;
      return { ...state, agents: JSON.parse(JSON.stringify(scenario.agents)) };
    }

    case "DELETE_SCENARIO": {
      const { [action.name]: _, ...rest } = state.scenarios;
      localStorage.setItem("capacity-scenarios", JSON.stringify(rest));
      return { ...state, scenarios: rest };
    }

    case "RESET":
      return { ...state, agents: action.defaultAgents };

    case "TOGGLE_SIDEBAR":
      return { ...state, ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed } };

    case "SET_CALLS_PER_HOUR":
      return {
        ...state,
        agents: state.agents.map((a) => ({ ...a, callsPerHour: action.callsPerHour })),
      };

    case "SET_VIEW_MODE":
      return { ...state, ui: { ...state.ui, viewMode: action.mode } };

    default:
      return state;
  }
}
