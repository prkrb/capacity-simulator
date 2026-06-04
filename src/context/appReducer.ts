import type { AppState, Scenario, QueueName } from "../types";
import { optimizeAgents } from "../utils/capacityCalc";

export type AppAction =
  | { type: "SET_AGENTS"; agents: import("../types").Agent[] }
  | { type: "ADD_AGENT"; agent: import("../types").Agent }
  | { type: "DELETE_AGENT"; agentId: string }
  | { type: "TOGGLE_AGENT_QUEUE"; agentId: string; queue: QueueName }
  | { type: "MOVE_AGENT"; agentId: string; shiftStart: number }
  | { type: "SET_VOLUME_DATA"; data: import("../types").VolumeEntry[] }
  | { type: "SAVE_SCENARIO"; name: string }
  | { type: "LOAD_SCENARIO"; name: string }
  | { type: "DELETE_SCENARIO"; name: string }
  | { type: "RESET"; defaultAgents: import("../types").Agent[] }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_CALLS_PER_DAY"; callsPerDay: number }
  | { type: "SET_VIEW_MODE"; mode: "timeline" | "shifts" }
  | { type: "SET_QUEUE_WEIGHTS"; weights: Record<import("../types").QueueName, number> }
  | { type: "OPTIMIZE_AGENTS" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_AGENTS":
      return { ...state, agents: action.agents };

    case "ADD_AGENT":
      return { ...state, agents: [...state.agents, action.agent] };

    case "DELETE_AGENT":
      return { ...state, agents: state.agents.filter((a) => a.id !== action.agentId) };

    case "TOGGLE_AGENT_QUEUE": {
      return {
        ...state,
        agents: state.agents.map((a) => {
          if (a.id !== action.agentId) return a;
          const has = a.queues.includes(action.queue);
          if (has && a.queues.length > 1) {
            return { ...a, queues: a.queues.filter((q) => q !== action.queue) };
          } else if (!has) {
            return { ...a, queues: [...a.queues, action.queue] };
          }
          return a; // can't remove last queue
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

    case "SET_CALLS_PER_DAY":
      return {
        ...state,
        agents: state.agents.map((a) => ({ ...a, callsPerDay: action.callsPerDay })),
      };

    case "SET_VIEW_MODE":
      return { ...state, ui: { ...state.ui, viewMode: action.mode } };

    case "SET_QUEUE_WEIGHTS":
      return { ...state, queueWeights: action.weights };

    case "OPTIMIZE_AGENTS":
      return { ...state, agents: optimizeAgents(state.agents, state.volumeData, state.queueWeights) };

    default:
      return state;
  }
}
