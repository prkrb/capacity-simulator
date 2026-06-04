import type { Agent, CapacitySlot, VolumeEntry, QueueName } from "../types";
import { ALL_QUEUES, SPECIALIST_QUEUES } from "../types";
import { HOURS, QUEUES_PER_AGENT } from "./defaults";

export function isAgentActiveAtHour(agent: Agent, hour: number): boolean {
  const shiftEnd = agent.shiftStart + agent.shiftDuration;
  return hour >= agent.shiftStart && hour < shiftEnd;
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
      const activeAgents = agents.filter(
        (a) => a.queues.includes(queue) && isAgentActiveAtHour(a, hour)
      );

      const capacity =
        activeAgents.reduce(
          (sum, a) => sum + a.callsPerHour / QUEUES_PER_AGENT,
          0
        );

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
 * Distributes agents across specialist queues proportional to call volume,
 * keeping each agent's shift time unchanged.
 */
export function optimizeAgents(agents: Agent[], volumeData: VolumeEntry[]): Agent[] {
  // Sum total volume per specialist queue
  const volumeByQueue = new Map<QueueName, number>();
  for (const q of SPECIALIST_QUEUES) {
    volumeByQueue.set(q, 0);
  }
  for (const entry of volumeData) {
    if (SPECIALIST_QUEUES.includes(entry.queue as any)) {
      volumeByQueue.set(entry.queue, (volumeByQueue.get(entry.queue) ?? 0) + entry.calls);
    }
  }

  const totalSpecialistVolume = Array.from(volumeByQueue.values()).reduce((a, b) => a + b, 0);
  if (totalSpecialistVolume === 0) return agents;

  // Calculate ideal agent count per specialist queue (proportional to volume)
  const totalAgents = agents.length;
  const idealCounts = new Map<QueueName, number>();
  let assigned = 0;
  const sortedQueues = [...SPECIALIST_QUEUES].sort(
    (a, b) => (volumeByQueue.get(b) ?? 0) - (volumeByQueue.get(a) ?? 0)
  );

  for (let i = 0; i < sortedQueues.length; i++) {
    const q = sortedQueues[i];
    if (i === sortedQueues.length - 1) {
      // Last queue gets the remainder to avoid rounding issues
      idealCounts.set(q, totalAgents - assigned);
    } else {
      const proportion = (volumeByQueue.get(q) ?? 0) / totalSpecialistVolume;
      const count = Math.round(proportion * totalAgents);
      idealCounts.set(q, count);
      assigned += count;
    }
  }

  // Reassign agents: sort by id for deterministic assignment
  const sortedAgents = [...agents].sort((a, b) => a.id.localeCompare(b.id));
  const result: Agent[] = [];
  let agentIdx = 0;

  for (const queue of SPECIALIST_QUEUES) {
    const count = idealCounts.get(queue) ?? 0;
    for (let i = 0; i < count && agentIdx < sortedAgents.length; i++) {
      const agent = sortedAgents[agentIdx];
      result.push({
        ...agent,
        specialistQueue: queue,
        queues: ["Config / Other", "Password", queue],
      });
      agentIdx++;
    }
  }

  return result;
}
