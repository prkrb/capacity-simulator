export type QueueName =
  | "Config / Other"
  | "Password"
  | "Tech"
  | "Billing"
  | "Labs"
  | "Accuro Engage";

export const UNIVERSAL_QUEUES: QueueName[] = ["Config / Other", "Password"];
export const SPECIALIST_QUEUES: QueueName[] = ["Tech", "Billing", "Labs", "Accuro Engage"];
export const ALL_QUEUES: QueueName[] = [...UNIVERSAL_QUEUES, ...SPECIALIST_QUEUES];

export interface Agent {
  id: string;
  shiftStart: number; // Hour offset from 5AM (0 = 5AM, 1 = 6AM, etc.)
  shiftDuration: number; // 8.5 fixed in v1
  callsPerDay: number; // Default: 16
  queues: QueueName[]; // Which queues this agent handles — effectiveness split evenly
}

export interface VolumeEntry {
  hour: number; // 0–11 (offset from 5AM)
  queue: QueueName;
  calls: number;
}

export interface CapacitySlot {
  hour: number;
  queue: QueueName;
  capacity: number;
  volume: number;
  delta: number; // capacity - volume
}

export interface Scenario {
  name: string;
  agents: Agent[];
  timestamp: number;
}

export interface AppState {
  agents: Agent[];
  volumeData: VolumeEntry[];
  queueWeights: Record<QueueName, number>;
  scenarios: Record<string, Scenario>;
  ui: {
    sidebarCollapsed: boolean;
    viewMode: "timeline" | "shifts";
  };
}
