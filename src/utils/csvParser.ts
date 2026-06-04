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

  // Parse WITHOUT headers so we get raw arrays — avoids PapaParse
  // mangling blank/duplicate column names
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  if (result.data.length < 2) {
    errors.push("CSV appears to be empty or has no data rows");
    return { data, errors, warnings };
  }

  const headerRow = result.data[0].map((h) => h.trim());
  const dataRows = result.data.slice(1);

  // Detect long format (hour, queue, calls columns)
  const hasQueueCol = headerRow.some((h) => h.toLowerCase() === "queue");
  const hasCallsCol = headerRow.some((h) => h.toLowerCase() === "calls");

  if (hasQueueCol && hasCallsCol) {
    const hourIdx = headerRow.findIndex((h) => ["hour", "time", "period", "hr"].includes(h.toLowerCase()));
    const queueIdx = headerRow.findIndex((h) => h.toLowerCase() === "queue");
    const callsIdx = headerRow.findIndex((h) => h.toLowerCase() === "calls");
    return parseLongFormatByIndex(dataRows, hourIdx >= 0 ? hourIdx : 0, queueIdx, callsIdx, errors, warnings);
  }

  // Pivoted format: first column is hours, rest are queues
  // Find the hour column by header name, or default to column 0
  let hourColIdx = headerRow.findIndex((h) =>
    ["hour", "time", "period", "hr"].includes(h.toLowerCase())
  );

  // Default to column 0 — hours are virtually always the first column
  if (hourColIdx < 0) hourColIdx = 0;

  // Map non-hour columns to queues
  const queueColumns: { colIdx: number; queue: QueueName }[] = [];
  for (let col = 0; col < headerRow.length; col++) {
    if (col === hourColIdx) continue;
    const h = headerRow[col];
    if (!h || !h.trim()) continue;
    const queue = normalizeQueueName(h);
    if (queue) {
      queueColumns.push({ colIdx: col, queue });
    } else {
      warnings.push(`Unrecognized queue column: "${h}" — skipping`);
    }
  }

  if (queueColumns.length === 0) {
    errors.push("No recognized queue columns found. Expected columns like: Billing, Tech, Password, Config/Other, Labs, Accuro Engage");
    return { data, errors, warnings };
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const hourRaw = (row[hourColIdx] ?? "").trim();
    if (!hourRaw) continue;

    const hourOffset = parseHourToOffset(hourRaw);
    if (hourOffset === null) {
      // Silently skip — likely a total/summary/header row
      continue;
    }

    for (const { colIdx, queue } of queueColumns) {
      const callsRaw = (row[colIdx] ?? "").trim();
      if (!callsRaw && callsRaw !== "0") {
        continue; // skip silently — empty cells are fine
      }
      const calls = parseInt(callsRaw, 10);
      if (isNaN(calls) || calls < 0) {
        warnings.push(`Row ${i + 2}: Invalid calls value "${callsRaw}" for "${queue}"`);
        continue;
      }
      data.push({ hour: hourOffset, queue, calls });
    }
  }

  checkForGaps(data, warnings);
  return { data, errors, warnings };
}

function parseLongFormatByIndex(
  rows: string[][],
  hourIdx: number,
  queueIdx: number,
  callsIdx: number,
  errors: string[],
  warnings: string[]
): CSVParseResult {
  const data: VolumeEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hourRaw = (row[hourIdx] ?? "").trim();
    const queueRaw = (row[queueIdx] ?? "").trim();
    const callsRaw = (row[callsIdx] ?? "").trim();

    if (!hourRaw) continue;

    const hourOffset = parseHourToOffset(hourRaw);
    const queue = normalizeQueueName(queueRaw);
    const calls = parseInt(callsRaw, 10);

    if (hourOffset === null) {
      warnings.push(`Row ${i + 2}: Invalid hour "${hourRaw}"`);
      continue;
    }
    if (!queue) {
      warnings.push(`Row ${i + 2}: Unrecognized queue "${queueRaw}"`);
      continue;
    }
    if (isNaN(calls) || calls < 0) {
      warnings.push(`Row ${i + 2}: Invalid calls value "${callsRaw}"`);
      continue;
    }

    data.push({ hour: hourOffset, queue, calls });
  }

  checkForGaps(data, warnings);
  return { data, errors, warnings };
}

function checkForGaps(data: VolumeEntry[], warnings: string[]) {
  // Only check gaps for hours and queues that appear in the data
  const queuesInData = new Set(data.map((d) => d.queue));
  const hoursInData = new Set(data.map((d) => d.hour));
  const seen = new Set(data.map((d) => `${d.hour}-${d.queue}`));
  const missing: string[] = [];
  for (const h of hoursInData) {
    for (const q of queuesInData) {
      if (!seen.has(`${h}-${q}`)) {
        missing.push(`${(h + OPERATIONAL_START).toString().padStart(2, "0")}:00 / ${q}`);
      }
    }
  }
  if (missing.length > 0 && missing.length <= 10) {
    warnings.push(`Missing data for: ${missing.join(", ")}`);
  } else if (missing.length > 10) {
    warnings.push(`Missing ${missing.length} hour/queue combinations`);
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
