import type { VolumeEntry } from "../types";

// Realistic call center volume patterns:
// - Config/Other and Password peak mid-morning
// - Specialist queues have varying patterns
// - Volume tapers off in early and late hours

const volumePatterns: Record<string, number[]> = {
  // Hour offsets 0-11 (5AM through 4PM)
  "Config / Other": [4, 8, 14, 18, 20, 22, 20, 18, 16, 14, 10, 6],
  "Password":       [6, 12, 16, 14, 12, 10, 9, 8, 10, 12, 8, 4],
  "Tech":           [2, 4, 8, 10, 12, 14, 12, 10, 8, 6, 4, 2],
  "Billing":        [1, 3, 6, 8, 10, 10, 12, 10, 8, 6, 4, 2],
  "Labs":           [1, 2, 4, 6, 8, 8, 6, 6, 4, 4, 2, 1],
  "Accuro Engage":  [1, 2, 3, 5, 6, 6, 5, 4, 4, 3, 2, 1],
};

export const sampleVolumeData: VolumeEntry[] = [];

for (const [queue, pattern] of Object.entries(volumePatterns)) {
  for (let hour = 0; hour < 12; hour++) {
    sampleVolumeData.push({
      hour,
      queue: queue as VolumeEntry["queue"],
      calls: pattern[hour],
    });
  }
}
