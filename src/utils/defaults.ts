import type { Agent, QueueName } from "../types";
import { SPECIALIST_QUEUES } from "../types";

export const HOURS = Array.from({ length: 12 }, (_, i) => i); // 0–11 representing 5AM–4PM

export const HOUR_LABELS = [
  "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM",
  "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM",
];

export const OPERATIONAL_START = 5; // 5 AM
export const SHIFT_DURATION = 8.5;
export const CALLS_PER_DAY = 16;
export const DEFAULT_QUEUES: QueueName[] = ["Config / Other", "Password"];
export const MAX_AGENTS = 40;

// Default queue weights — relative priority per queue
export const DEFAULT_QUEUE_WEIGHTS: Record<QueueName, number> = {
  "Config / Other": 10,
  "Password": 10,
  "Tech": 50,
  "Billing": 40,
  "Labs": 30,
  "Accuro Engage": 30,
};

// Max shift start offset so shift doesn't exceed operational window
// 12 hours total - 8.5 hour shift = 3.5 max start offset
export const MAX_SHIFT_START = 3.5;

export const QUEUE_COLORS: Record<QueueName, string> = {
  "Config / Other": "#64748b", // slate
  "Password": "#6b8f71",      // grey-green
  "Tech": "#3b82f6",          // blue
  "Billing": "#f97316",       // orange
  "Labs": "#a855f7",          // purple
  "Accuro Engage": "#14b8a6", // teal
};

export const QUEUE_SHORT_LABELS: Record<QueueName, string> = {
  "Config / Other": "CFG",
  "Password": "PWD",
  "Tech": "TECH",
  "Billing": "BILL",
  "Labs": "LABS",
  "Accuro Engage": "AE",
};

export function formatHour(offset: number): string {
  const hour24 = OPERATIONAL_START + offset;
  if (hour24 === 0 || hour24 === 24) return "12 AM";
  if (hour24 === 12) return "12 PM";
  if (hour24 < 12) return `${hour24} AM`;
  return `${hour24 - 12} PM`;
}

export function formatTime(offset: number): string {
  const totalHours = OPERATIONAL_START + offset;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function createAgent(id: number, queues: QueueName[] = DEFAULT_QUEUES, shiftStart: number = 1): Agent {
  return {
    id: `agent-${id.toString().padStart(2, "0")}`,
    shiftStart,
    shiftDuration: SHIFT_DURATION,
    callsPerDay: CALLS_PER_DAY,
    queues: [...queues],
  };
}

export function createDefaultAgents(): Agent[] {
  const agents: Agent[] = [];
  const perQueue = 10;

  SPECIALIST_QUEUES.forEach((queue, queueIndex) => {
    for (let i = 0; i < perQueue; i++) {
      const agentNum = queueIndex * perQueue + i + 1;
      const shiftStart = Math.floor(i / 3);
      agents.push(createAgent(agentNum, [...DEFAULT_QUEUES, queue], Math.min(shiftStart, MAX_SHIFT_START)));
    }
  });

  return agents;
}
