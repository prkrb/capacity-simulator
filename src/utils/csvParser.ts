import Papa from "papaparse";
import type { Agent, VolumeEntry, QueueName } from "../types";
import { ALL_QUEUES } from "../types";
import { OPERATIONAL_START } from "./defaults";

const VALID_QUEUE_NAMES = new Set<string>(ALL_QUEUES);

interface CSVRow {
  hour: string;
  queue: string;
  calls: string;
}

export interface CSVParseResult {
  data: VolumeEntry[];
  errors: string[];
  warnings: string[];
}

function parseHourToOffset(hourStr: string): number | null {
  const match = hourStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const offset = hour - OPERATIONAL_START;
  if (offset < 0 || offset > 11) return null;
  return offset;
}

export function parseVolumeCSV(csvText: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: VolumeEntry[] = [];

  const result = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  const headers = result.meta.fields ?? [];
  if (!headers.includes("hour")) errors.push('Missing required column: "hour"');
  if (!headers.includes("queue")) errors.push('Missing required column: "queue"');
  if (!headers.includes("calls")) errors.push('Missing required column: "calls"');

  if (errors.length > 0) return { data, errors, warnings };

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const hourOffset = parseHourToOffset(row.hour?.trim());
    const queue = row.queue?.trim();
    const calls = parseInt(row.calls?.trim(), 10);

    if (hourOffset === null) {
      warnings.push(`Row ${i + 2}: Invalid hour "${row.hour}"`);
      continue;
    }

    if (!VALID_QUEUE_NAMES.has(queue)) {
      warnings.push(`Row ${i + 2}: Unrecognized queue "${queue}"`);
      continue;
    }

    if (isNaN(calls) || calls < 0) {
      warnings.push(`Row ${i + 2}: Invalid calls value "${row.calls}"`);
      continue;
    }

    data.push({
      hour: hourOffset,
      queue: queue as QueueName,
      calls,
    });
  }

  // Check for gaps
  const seen = new Set(data.map((d) => `${d.hour}-${d.queue}`));
  for (let h = 0; h < 12; h++) {
    for (const q of ALL_QUEUES) {
      if (!seen.has(`${h}-${q}`)) {
        warnings.push(`Missing data for hour ${h + OPERATIONAL_START}:00, queue "${q}"`);
      }
    }
  }

  return { data, errors, warnings };
}

export function generateSampleCSV(): string {
  const rows = ["hour,queue,calls"];
  for (let h = 0; h < 12; h++) {
    const hourStr = `${(OPERATIONAL_START + h).toString().padStart(2, "0")}:00`;
    for (const queue of ALL_QUEUES) {
      const calls = Math.round(5 + Math.random() * 15);
      rows.push(`${hourStr},${queue},${calls}`);
    }
  }
  return rows.join("\n");
}

export function exportAgentScheduleCSV(agents: Agent[]): string {
  const rows = ["agent_id,specialist_queue,shift_start,shift_end"];
  for (const agent of agents) {
    const startHour = OPERATIONAL_START + agent.shiftStart;
    const endHour = startHour + agent.shiftDuration;
    const startStr = `${Math.floor(startHour).toString().padStart(2, "0")}:${((startHour % 1) * 60).toString().padStart(2, "0")}`;
    const endStr = `${Math.floor(endHour).toString().padStart(2, "0")}:${((endHour % 1) * 60).toString().padStart(2, "0")}`;
    rows.push(`${agent.id},${agent.specialistQueue},${startStr},${endStr}`);
  }
  return rows.join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
