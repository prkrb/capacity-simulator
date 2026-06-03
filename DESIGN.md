# Call Center Capacity Simulator — Design Document

**Project:** Call Center Scheduling & Capacity Dashboard  
**Version:** 1.0 (v1 Scope)  
**Last Updated:** June 2026  
**Stack:** React + Vite + Tailwind CSS

---

## 1. Project Overview

A browser-based workforce scheduling simulator that visualizes call center capacity against incoming call volume across a 12-hour operational window (5:00 AM – 5:00 PM). Users drag and reassign agent shift blocks to model staffing scenarios in real time, with live chart updates showing the impact on each team's handled vs. incoming call load.

This tool is a **capacity simulator first** — agents are anonymous tokens, not named employees. The goal is to answer: *if we staff this way, what happens to each queue?*

---

## 2. Core Concepts

### 2.1 Queues (Teams)

There are six queues. All agents cover the first two by default; each agent additionally specializes in exactly one of the remaining four:

| Queue | Type |
|---|---|
| Config / Other | Universal (all agents) |
| Password | Universal (all agents) |
| Tech | Specialist (one-third of agents) |
| Billing | Specialist (one-third of agents) |
| Labs | Specialist (one-third of agents) |
| Accuro Engage | Specialist (one-third of agents) |

> Note: Distribution across specialist queues is user-defined at setup — it does not have to be equal thirds.

### 2.2 Agents

- **Count:** ~40 agent tokens (anonymous, no names)
- **Queues covered:** Each agent covers exactly 3 queues: Config/Other + Password + their assigned specialist queue
- **Calls per hour (baseline):** 2 calls/hour per agent, distributed evenly across their 3 active queues (~0.667 calls/hr per queue)
- **Shift length:** 8.5 hours (fixed for v1)
- **Shift window:** Must fall within 5:00 AM – 5:00 PM (12-hour operational window)

### 2.3 Capacity Model (v1)

```
agent_capacity_per_queue_per_hour = total_calls_per_hour / number_of_queues_covered
                                  = 2 / 3
                                  ≈ 0.667 calls/hr/queue
```

For any given hour, total capacity per queue is:

```
queue_capacity[hour] = count_of_active_agents_in_that_queue_during_that_hour × 0.667
```

An agent is "active" during an hour if their shift block overlaps that hour.

### 2.4 Volume Data

- Loaded via **CSV upload**
- Represents historical average incoming call volume per queue per hour
- Used as the baseline against which capacity is compared

---

## 3. Functional Requirements

### 3.1 Agent Management Panel

- Display all agent tokens in a list or grid
- Each agent shows:
  - Agent number (e.g., Agent 01 – Agent 40)
  - Specialist queue badge (color-coded)
  - Current shift window (e.g., 6:00 AM – 2:30 PM)
- User can:
  - Create agents (up to 40 for v1)
  - Assign or reassign a specialist queue via dropdown
  - Delete an agent token

### 3.2 Timeline Grid (Scheduling View)

- **X axis:** 5:00 AM to 5:00 PM, divided into 12 hourly columns
- **Y axis:** One row per agent (grouped by specialist queue for readability)
- Each agent has a **shift block** — a colored bar spanning 8.5 hours
- Shift blocks are **draggable** left and right along the timeline
- Drag snaps to the nearest hour increment
- Shift blocks cannot extend beyond 5:00 AM or 5:00 PM boundaries
- Blocks are color-coded by specialist queue assignment
- Visual indicator on each block showing queue initials (e.g., "TECH", "BILL")

### 3.3 Capacity vs. Volume Charts

- One chart per queue (6 total)
- Each chart displays:
  - **Incoming volume** (from CSV): shown as a filled area or line
  - **Handled capacity** (calculated live): shown as a contrasting bar or line
  - **Delta:** difference between capacity and volume (surplus = green, deficit = red)
- Charts update in **real time** as agent blocks are moved
- Summary stat per chart: total daily handled vs. total daily incoming

### 3.4 Summary Dashboard Bar

A persistent top-of-page summary strip showing:

| Metric | Description |
|---|---|
| Total Agents Active | Count of agents currently placed on the timeline |
| Peak Understaffed Hours | Hour(s) with the largest capacity deficit across all queues |
| Highest Deficit Queue | Which queue is most under-capacity overall |
| Coverage Score | Optional: a single 0–100% score representing overall coverage |

### 3.5 CSV Upload (Volume Data)

- User uploads a `.csv` file via a clearly labeled upload button
- Expected CSV format:

```
hour,queue,calls
05:00,Config / Other,12
05:00,Password,8
05:00,Tech,5
05:00,Billing,3
05:00,Labs,4
05:00,Accuro Engage,2
06:00,Config / Other,18
...
```

- If no CSV is uploaded, the dashboard uses a **default sample dataset** so the tool is immediately usable
- A "Download Sample CSV" button provides a template the user can fill in
- Validation: warn the user if the CSV is missing columns, contains unrecognized queue names, or has gaps in hours

### 3.6 Scenario Controls

| Control | Behavior |
|---|---|
| Reset to Default | Returns all agent blocks to their original positions |
| Save Scenario | Saves current layout to browser local storage with a name |
| Load Scenario | Restores a previously saved layout |
| Export Schedule | Downloads current agent layout as a CSV |

---

## 4. Data Structures

### 4.1 Agent Object

```typescript
interface Agent {
  id: string;                          // e.g., "agent-01"
  specialistQueue: QueueName;          // One of the four specialist queues
  shiftStart: number;                  // Hour offset from 5AM (0–11)
  shiftDuration: number;               // 8.5 (fixed in v1)
  callsPerHour: number;                // Default: 2
  queues: QueueName[];                 // Derived: always [Config/Other, Password, specialistQueue]
}
```

### 4.2 Queue Names (Enum)

```typescript
type QueueName =
  | "Config / Other"
  | "Password"
  | "Tech"
  | "Billing"
  | "Labs"
  | "Accuro Engage";
```

### 4.3 Volume Data Object

```typescript
interface VolumeEntry {
  hour: number;        // 0–11 (offset from 5AM)
  queue: QueueName;
  calls: number;
}
```

### 4.4 Capacity Calculation Output

```typescript
interface CapacitySlot {
  hour: number;
  queue: QueueName;
  capacity: number;    // Calculated from active agents
  volume: number;      // From CSV
  delta: number;       // capacity - volume (positive = surplus, negative = deficit)
}
```

---

## 5. Component Architecture

```
App
├── TopSummaryBar               # Key metrics strip
├── Sidebar
│   ├── CSVUploader             # File input + validation
│   ├── AgentRoster             # List of all agents
│   │   └── AgentToken          # Individual agent row (queue selector, shift info)
│   └── ScenarioControls        # Save / Load / Reset / Export
├── TimelineGrid                # Main scheduling view
│   ├── HourHeaders             # 5AM–5PM column labels
│   ├── QueueGroupRow[]         # One group per specialist queue
│   │   └── AgentShiftBlock[]   # Draggable shift bars
└── ChartsPanel
    └── QueueChart[]            # One per queue (6 total)
        ├── VolumeArea
        ├── CapacityBar
        └── DeltaIndicator
```

---

## 6. UX & Interaction Design

### 6.1 Drag Behavior

- Clicking and holding a shift block activates drag mode
- A ghost/preview of the block follows the cursor
- Snapping grid lines appear at each hour column during drag
- On release, block snaps to nearest valid hour
- If the drag would push the block outside 5AM–5PM bounds, it snaps to the nearest valid position instead of being blocked
- Charts begin recalculating immediately on drag start (throttled to 60fps)

### 6.2 Layout

- **Dark mode by default** — reduces eye strain for operational staff
- **Left sidebar:** Agent roster + controls (~280px)
- **Center:** Timeline grid (fills remaining width)
- **Bottom panel or right panel:** Queue charts (toggleable if screen is small)
- Responsive breakpoint: timeline collapses to a scrollable view on narrower screens

### 6.3 Color System

Each specialist queue has a consistent color used across the timeline blocks and chart lines:

| Queue | Color Role |
|---|---|
| Config / Other | Neutral (grey-blue) |
| Password | Neutral (grey-green) |
| Tech | Accent 1 (blue) |
| Billing | Accent 2 (orange) |
| Labs | Accent 3 (purple) |
| Accuro Engage | Accent 4 (teal) |

Surplus/deficit deltas use a separate semantic color layer: green for surplus, amber for near-zero, red for deficit.

---

## 7. v1 Constraints & Known Simplifications

These are intentional simplifications for the initial build. Each is designed to be extended later:

| Simplification | Future Enhancement |
|---|---|
| All agents handle exactly 3 queues | Per-agent queue weighting (e.g. 60% Tech / 20% Config / 20% Password) |
| Uniform 2 calls/hour per agent | Per-agent throughput based on historical performance |
| Fixed 8.5-hour shifts | Variable shift lengths (4hr, 6hr, 8.5hr, 9hr) with lunch blocking |
| Agents anonymous (no names) | Named agents imported from HR/WFM system |
| Equal call distribution across queues | Weighted distribution by agent profile |
| Single scenario at a time | Side-by-side scenario comparison |
| No breaks/shrinkage | Shrinkage factor per agent or globally |
| No service level targets | SLA overlays (e.g. 80% answered in 20 sec) |

---

## 8. CSV Format Specification

### Volume CSV (Required for real data, sample provided as fallback)

| Column | Type | Format | Example |
|---|---|---|---|
| `hour` | string | HH:MM (24hr) | `08:00` |
| `queue` | string | Must match queue name exactly | `Tech` |
| `calls` | integer | Whole number | `42` |

- One row per hour per queue
- 12 hours × 6 queues = 72 rows minimum
- Hours: `05:00` through `16:00` (representing 5AM–4PM, the last full hour)

### Agent Export CSV (Generated by the app)

| Column | Example |
|---|---|
| `agent_id` | `agent-07` |
| `specialist_queue` | `Tech` |
| `shift_start` | `07:00` |
| `shift_end` | `15:30` |

---

## 9. State Management

Use **React Context + useReducer** for v1 (no external library needed at this scale).

Global state includes:
- `agents[]` — full agent list with positions
- `volumeData[]` — parsed CSV data
- `capacityData[]` — derived/calculated, recomputed on any agent change
- `scenarios{}` — saved scenario map (persisted to localStorage)
- `ui` — sidebar collapse state, selected queue filter, etc.

Capacity recalculation should be a pure function triggered by any change to `agents[]`:

```typescript
function calculateCapacity(agents: Agent[], hours: number[]): CapacitySlot[]
```

---

## 10. File Structure

```
/src
  /components
    /timeline
      TimelineGrid.tsx
      AgentShiftBlock.tsx
      HourHeaders.tsx
      QueueGroupRow.tsx
    /charts
      ChartsPanel.tsx
      QueueChart.tsx
    /sidebar
      AgentRoster.tsx
      AgentToken.tsx
      CSVUploader.tsx
      ScenarioControls.tsx
    TopSummaryBar.tsx
  /context
    AppContext.tsx
    appReducer.ts
  /hooks
    useCapacityCalculator.ts
    useDragAndDrop.ts
    useCSVParser.ts
  /utils
    capacityCalc.ts
    csvParser.ts
    defaults.ts
  /types
    index.ts
  /data
    sampleVolume.ts       # Default dataset if no CSV uploaded
  App.tsx
  main.tsx
```

---

## 11. Build & Run

```bash
# Scaffold
npm create vite@latest callcenter-simulator -- --template react-ts
cd callcenter-simulator
npm install

# Dependencies
npm install recharts         # Charts
npm install @dnd-kit/core    # Drag and drop
npm install @dnd-kit/sortable
npm install papaparse        # CSV parsing
npm install @types/papaparse

# Dev
npm run dev

# Build
npm run build
```

---

## 12. Future Roadmap

**v1.1 — Agent Weighting**  
Add per-agent queue distribution sliders. Agent handles 60% Tech, 20% Config, 20% Password.

**v1.2 — Variable Shifts**  
Support 4hr, 6hr, and 9hr shifts. Add lunch/break blocking that zeroes out capacity for 30–60 min windows.

**v1.3 — Named Agents**  
Import agents from a CSV roster (name, queue, default shift). Blocks display name instead of agent number.

**v1.4 — Scenario Comparison**  
Side-by-side view of two saved scenarios. Highlight deltas between them.

**v1.5 — Service Level Overlay**  
Add a target line to each chart (e.g. "need capacity ≥ 120% of volume to hit SLA"). Color-code deficit zones.

**v2.0 — Live Data Integration**  
Pull volume data from phone system API (e.g. Genesys, NICE, Five9) instead of CSV upload.
