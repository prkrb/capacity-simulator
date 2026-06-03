import { useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { getCapacityForQueue, getTotalDailyStats, getPeakDeficitHours, getHighestDeficitQueue, getCoverageScore, getAgentsNeeded } from "../utils/capacityCalc";
import type { QueueName } from "../types";

export function useCapacityForQueue(queue: QueueName) {
  const { capacityData } = useAppContext();
  return useMemo(() => getCapacityForQueue(capacityData, queue), [capacityData, queue]);
}

export function useDailyStats(queue: QueueName) {
  const { state, capacityData } = useAppContext();
  const callsPerHour = state.agents[0]?.callsPerHour ?? 2;
  return useMemo(() => ({
    ...getTotalDailyStats(capacityData, queue),
    agentsNeeded: getAgentsNeeded(capacityData, queue, callsPerHour),
  }), [capacityData, queue, callsPerHour]);
}

export function useSummaryStats() {
  const { state, capacityData } = useAppContext();
  return useMemo(() => {
    const totalCapacity = capacityData.reduce((sum, s) => sum + s.capacity, 0);
    const totalVolume = capacityData.reduce((sum, s) => sum + s.volume, 0);
    return {
      totalAgents: state.agents.length,
      callsPerHour: state.agents[0]?.callsPerHour ?? 2,
      totalCapacity: Math.round(totalCapacity * 10) / 10,
      totalVolume,
      totalDelta: Math.round((totalCapacity - totalVolume) * 10) / 10,
      peakDeficitHours: getPeakDeficitHours(capacityData),
      highestDeficitQueue: getHighestDeficitQueue(capacityData),
      coverageScore: getCoverageScore(capacityData),
    };
  }, [state.agents, capacityData]);
}
