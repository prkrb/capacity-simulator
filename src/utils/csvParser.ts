import Papa from "papaparse";
import type { Agent, VolumeEntry, QueueName } from "../types";
import { ALL_QUEUES } from "../types";
import { OPERATIONAL_START } from "./defaults";

export interface CSVParseResult {
  data: VolumeEntry[];
  errors: string[];
  warnings: string[];
}

// Map common variations of queue names to canonical names
const QUEUE_NAME_ALIASES: Record<string, QueueName> = {
  "config / other": "Config / Other",
  "config/other": "Config / Other",
  "config": "Config / Other",
  "other": "Config / Other",
  "password": "Password",
  "tech": "Tech",
  "technical": "Tech",
  "billing": "Billing",
  "labs": "Labs",
  "lab": "Labs",
  "accuro engage": "Accuro Engage",
  "accuro": "Accuro Engage",
  "engage": "Accuro Engage",
};

function normalizeQueueName(raw: string): QueueName | null {
  const key = raw.trim().toLowerCase();
  return QUEUE_NAME_ALIASES[key] ?? null;
}

function parseHourToOffset(hourStr: string): number | null {
  const trimmed = hourStr.trim();

  // Try HH:MM format (e.g. "08:00", "16:00")
  const matchTime = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (matchTime) {
    const hour = parseInt(matchTime[1], 10);
    const offset = hour - OPERATIONAL_START;
    if (offset >= 0 && offset <= 11) return offset;
    return null;
  }

  // Try AM/PM format (e.g. "5AM", "10 AM", "1PM", "1 PM", "12PM")
  const matchAmPm = trimmed.match(/^(\d{1,2})\s*(AM|PM|am|pm|a|p)\.?[mM]?\.?$/i);
  if (matchAmPm) {
    let hour = parseInt(matchAmPm[1], 10);
    const period = matchAmPm[2].toUpperCase().charAt(0);
    if (period === "P" && hour !== 12) hour += 12;
    if (period === "A" && hour === 12) hour = 0;
    const offset = hour - OPERATIONAL_START;
    if (offset >= 0 && offset <= 11) return offset;
    return null;
  }

  // Try HH:MM AM/PM format (e.g. "5:00 AM", "1:00PM")
  const matchTimeAmPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (matchTimeAmPm) {
    let hour = parseInt(matchTimeAmPm[1], 10);
    const period = matchTimeAmPm[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    const offset = hour - OPERATIONAL_START;
    if (offset >= 0 && offset <= 11) return offset;
    return null;
  }

  // Try plain number (e.g. "5", "16")
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    const offset = num - OPERATIONAL_START;
    if (offset >= 0 && offset <= 11) return offset;
  }

  return null;
}

export function parseVolumeCSV(csvText: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: VolumeEntry[] = [];

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    errors.push("CSV appears to be empty");
    return { data, errors, warnings };
  }

  // Find the hour column (first column, or one named "hour")
  const hourHeader = headers.find((h) => h.toLowerCase() === "hour") ?? headers[0];

  // Detect format: pivoted (queue names as columns) vs. long (hour, queue, calls)
  const hasQueueCol = headers.some((h) => h.toLowerCase() === "queue");
  const hasCallsCol = headers.some((h) => h.toLowerCase() === "calls");

  if (hasQueueCol && hasCallsCol) {
    // Long format: hour, queue, calls
    return parseLongFormat(result.data, errors, warnings);
  }

  // Pivoted format: Hour, Billing, Tech, Password, ...
  // Every column besides the hour column is a queue
  const queueColumns: { header: string; queue: QueueName }[] = [];
  for (const h of headers) {
    if (h === hourHeader) continue;
    const queue = normalizeQueueName(h);
    if (queue) {
      queueColumns.push({ header: h, queue });
    } else {
      warnings.push(`Unrecognized queue column: "${h}" — skipping`);
    }
  }

  if (queueColumns.length === 0) {
    errors.push("No recognized queue columns found. Expected columns like: Billing, Tech, Password, Config/Other, Labs, Accuro Engage");
    return { data, errors, warnings };
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const hourRaw = row[hourHeader];
    if (!hourRaw) continue;

    const hourOffset = parseHourToOffset(hourRaw);
    if (hourOffset === null) {
      warnings.push(`Row ${i + 2}: Invalid hour "${hourRaw}"`);
      continue;
    }

    for (const { header, queue } of queueColumns) {
      const callsRaw = row[header]?.trim();
      if (!callsRaw && callsRaw !== "0") {
        warnings.push(`Row ${i + 2}: Missing value for "${header}"`);
        continue;
      }
      const calls = parseInt(callsRaw, 10);
      if (isNaN(calls) || calls < 0) {
        warnings.push(`Row ${i + 2}: Invalid calls value "${callsRaw}" for "${header}"`);
        continue;
      }
      data.push({ hour: hourOffset, queue, calls });
    }
  }

  checkForGaps(data, warnings);
  return { data, errors, warnings };
}

function parseLongFormat(
  rows: Record<string, string>[],
  errors: string[],
  warnings: string[]
): CSVParseResult {
  const data: VolumeEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hourKey = Object.keys(row).find((k) => k.toLowerCase() === "hour");
    const queueKey = Object.keys(row).find((k) => k.toLowerCase() === "queue");
    const callsKey = Object.keys(row).find((k) => k.toLowerCase() === "calls");

    if (!hourKey || !queueKey || !callsKey) continue;

    const hourOffset = parseHourToOffset(row[hourKey]);
    const queue = normalizeQueueName(row[queueKey]);
    const calls = parseInt(row[callsKey]?.trim(), 10);

    if (hourOffset === null) {
      warnings.push(`Row ${i + 2}: Invalid hour "${row[hourKey]}"`);
      continue;
    }
    if (!queue) {
      warnings.push(`Row ${i + 2}: Unrecognized queue "${row[queueKey]}"`);
      continue;
    }
    if (isNaN(calls) || calls < 0) {
      warnings.push(`Row ${i + 2}: Invalid calls value "${row[callsKey]}"`);
      continue;
    }

    data.push({ hour: hourOffset, queue, calls });
  }

  checkForGaps(data, warnings);
  return { data, errors, warnings };
}

function checkForGaps(data: VolumeEntry[], warnings: string[]) {
  const seen = new Set(data.map((d) => `${d.hour}-${d.queue}`));
  for (let h = 0; h < 12; h++) {
    for (const q of ALL_QUEUES) {
      if (!seen.has(`${h}-${q}`)) {
        warnings.push(`Missing data for ${(h + OPERATIONAL_START).toString().padStart(2, "0")}:00, queue "${q}"`);
      }
    }
  }
}

export function generateSampleCSV(): string {
  const queues = ALL_QUEUES;
  const header = ["Hour", ...queues].join(",");
  const rows = [header];
  for (let h = 0; h < 12; h++) {
    const hourStr = `${(OPERATIONAL_START + h).toString().padStart(2, "0")}:00`;
    const calls = queues.map(() => Math.round(5 + Math.random() * 15));
    rows.push([hourStr, ...calls].join(","));
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
