import type { Agent, CapacitySlot, VolumeEntry, QueueName } from "../types";
import { ALL_QUEUES, SPECIALIST_QUEUES } from "../types";
import { HOURS, QUEUES_PER_AGENT } from "./defaults";

const LUNCH_DURATION = 0.5; // 30 minutes

export function isAgentActiveAtHour(agent: Agent, hour: number): boolean {
  const shiftEnd = agent.shiftStart + agent.shiftDuration;
  return hour >= agent.shiftStart && hour < shiftEnd;
}

/**
 * Returns the fraction of the given hour (0-1) that the agent is available,
 * accounting for a 30-minute lunch at the midpoint of their shift.
 */
function agentAvailability(agent: Agent, hour: number): number {
  const shiftEnd = agent.shiftStart + agent.shiftDuration;
  if (hour >= shiftEnd || hour + 1 <= agent.shiftStart) return 0;

  // Lunch starts at the midpoint of the shift
  const lunchStart = agent.shiftStart + (agent.shiftDuration - LUNCH_DURATION) / 2;
  const lunchEnd = lunchStart + LUNCH_DURATION;

  // How much of this hour block [hour, hour+1) overlaps with lunch?
  const overlapStart = Math.max(hour, lunchStart);
  const overlapEnd = Math.min(hour + 1, lunchEnd);
  const lunchOverlap = Math.max(0, overlapEnd - overlapStart);

  // How much of this hour block the agent is working (before lunch deduction)
  const workStart = Math.max(hour, agent.shiftStart);
  const workEnd = Math.min(hour + 1, shiftEnd);
  const workHours = Math.max(0, workEnd - workStart);

  return workHours - lunchOverlap;
}

export function calculateCapacity(
  agents: Agent[],
  volumeData: VolumeEntry[]
): CapacitySlot[] {
  const volumeMap = new Map<string, number>();
  for (const entry of volumeData) {
    volumeMap.set(`${entry.hour}-${entry.queue}`, entry.calls);
  }

  const slots: CapacitySlot[] = [];

  for (const hour of HOURS) {
    for (const queue of ALL_QUEUES) {
      let capacity = 0;
      for (const agent of agents) {
        if (!agent.queues.includes(queue)) continue;
        const avail = agentAvailability(agent, hour);
        if (avail > 0) {
          capacity += (agent.callsPerHour / QUEUES_PER_AGENT) * avail;
        }
      }

      const volume = volumeMap.get(`${hour}-${queue}`) ?? 0;

      slots.push({
        hour,
        queue,
        capacity: Math.round(capacity * 100) / 100,
        volume,
        delta: Math.round((capacity - volume) * 100) / 100,
      });
    }
  }

  return slots;
}

export function getCapacityForQueue(
  capacityData: CapacitySlot[],
  queue: QueueName
): CapacitySlot[] {
  return capacityData.filter((s) => s.queue === queue);
}

export function getTotalDailyStats(capacityData: CapacitySlot[], queue: QueueName) {
  const queueData = getCapacityForQueue(capacityData, queue);
  const totalCapacity = queueData.reduce((sum, s) => sum + s.capacity, 0);
  const totalVolume = queueData.reduce((sum, s) => sum + s.volume, 0);
  return {
    totalCapacity: Math.round(totalCapacity * 100) / 100,
    totalVolume,
    totalDelta: Math.round((totalCapacity - totalVolume) * 100) / 100,
  };
}

export function getPeakDeficitHours(capacityData: CapacitySlot[]): { hour: number; deficit: number }[] {
  const hourDeficits = new Map<number, number>();

  for (const slot of capacityData) {
    if (slot.delta < 0) {
      const current = hourDeficits.get(slot.hour) ?? 0;
      hourDeficits.set(slot.hour, current + slot.delta);
    }
  }

  return Array.from(hourDeficits.entries())
    .map(([hour, deficit]) => ({ hour, deficit }))
    .sort((a, b) => a.deficit - b.deficit);
}

export function getHighestDeficitQueue(capacityData: CapacitySlot[]): { queue: QueueName; deficit: number } | null {
  const queueDeficits = new Map<QueueName, number>();

  for (const queue of ALL_QUEUES) {
    const stats = getTotalDailyStats(capacityData, queue);
    if (stats.totalDelta < 0) {
      queueDeficits.set(queue, stats.totalDelta);
    }
  }

  if (queueDeficits.size === 0) return null;

  let worst: { queue: QueueName; deficit: number } | null = null;
  for (const [queue, deficit] of queueDeficits) {
    if (!worst || deficit < worst.deficit) {
      worst = { queue, deficit };
    }
  }

  return worst;
}

export function getAgentsNeededPerHour(
  capacityData: CapacitySlot[],
  callsPerHour: number
): { hour: number; agentsNeeded: number; worstDeficit: number }[] {
  const perAgentContribution = callsPerHour / QUEUES_PER_AGENT;

  return HOURS.map((hour) => {
    const hourSlots = capacityData.filter((s) => s.hour === hour);
    const worstDelta = Math.min(...hourSlots.map((s) => s.delta));
    const agentsNeeded = worstDelta < 0 ? Math.ceil(Math.abs(worstDelta) / perAgentContribution) : 0;
    return { hour, agentsNeeded, worstDeficit: Math.round(worstDelta * 10) / 10 };
  });
}

export function getAgentsNeeded(
  capacityData: CapacitySlot[],
  queue: QueueName,
  callsPerHour: number
): number {
  const queueData = getCapacityForQueue(capacityData, queue);
  const worstDelta = Math.min(...queueData.map((s) => s.delta));
  if (worstDelta >= 0) return 0;
  const perAgentContribution = callsPerHour / QUEUES_PER_AGENT;
  return Math.ceil(Math.abs(worstDelta) / perAgentContribution);
}

export function getCoverageScore(capacityData: CapacitySlot[]): number {
  const totalSlots = capacityData.length;
  if (totalSlots === 0) return 100;

  const coveredSlots = capacityData.filter((s) => s.delta >= 0).length;
  return Math.round((coveredSlots / totalSlots) * 100);
}

/**
 * Optimize agent specialist queue assignments to maximize coverage.
 * Greedy approach: repeatedly find the queue/hour with the worst deficit
 * and reassign the agent whose move would reduce total deficit the most.
 */
export function optimizeAgents(agents: Agent[], volumeData: VolumeEntry[]): Agent[] {
  if (agents.length === 0 || volumeData.length === 0) return agents;

  // Build volume lookup
  const volumeMap = new Map<string, number>();
  for (const entry of volumeData) {
    volumeMap.set(`${entry.hour}-${entry.queue}`, entry.calls);
  }

  // Work with mutable copies of specialist queue assignments
  const assignments = agents.map((a) => ({ ...a }));

  // Helper: calculate total deficit (sum of all negative deltas) for current assignments
  function totalDeficit(agentList: Agent[]): number {
    const slots = calculateCapacity(agentList, volumeData);
    let deficit = 0;
    for (const slot of slots) {
      if (slot.delta < 0) deficit += slot.delta;
    }
    return deficit;
  }

  // Greedy: try reassigning each agent to each specialist queue,
  // pick the single move that improves total deficit the most, repeat.
  let improved = true;
  let bestDeficit = totalDeficit(assignments);

  while (improved) {
    improved = false;
    let bestMove: { agentIdx: number; queue: QueueName } | null = null;
    let bestNewDeficit = bestDeficit;

    for (let i = 0; i < assignments.length; i++) {
      const original = assignments[i].specialistQueue;

      for (const queue of SPECIALIST_QUEUES) {
        if (queue === original) continue;

        // Temporarily reassign
        assignments[i].specialistQueue = queue;
        assignments[i].queues = ["Config / Other", "Password", queue];

        const d = totalDeficit(assignments);
        if (d > bestNewDeficit) {
          bestNewDeficit = d;
          bestMove = { agentIdx: i, queue };
        }

        // Revert
        assignments[i].specialistQueue = original;
        assignments[i].queues = ["Config / Other", "Password", original];
      }
    }

    if (bestMove && bestNewDeficit > bestDeficit) {
      assignments[bestMove.agentIdx].specialistQueue = bestMove.queue;
      assignments[bestMove.agentIdx].queues = ["Config / Other", "Password", bestMove.queue];
      bestDeficit = bestNewDeficit;
      improved = true;
    }
  }

  return assignments;
}
