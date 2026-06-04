export interface ShiftSlot {
  label: string;
  shiftStart: number;
}

export const SHIFT_SLOTS: ShiftSlot[] = [
  { label: "5:00–1:30", shiftStart: 0 },
  { label: "6:00–2:30", shiftStart: 1 },
  { label: "7:00–3:30", shiftStart: 2 },
  { label: "8:30–5:00", shiftStart: 3.5 },
];
