export interface OasesRow {
  departureDate: string; // YYYY-MM-DD
  deptTime: string; // HH:MM:SS
  arrvTime: string; // HH:MM:SS
  techLogPage: number;
  workOrder: number | null;
  sectorId: string;
  duration: string; // HH:MM:SS
  durationMinutes: number;
  landings: number;
  flightNo: number | null;
}

export interface WingtracRow {
  tail: string;
  airline: string;
  flight: string;
  dep: string;
  arr: string;
  date: string; // DDMMMYY e.g. 01MAY26
  parsedDate: string; // YYYY-MM-DD
  ofb: number | null;
  onb: number | null;
  stime: number;
  atime: number | null;
  airbone: number | null;
}

export type FlagType =
  | "ok"
  | "minor_diff" // diff <= 5 mins, use oases
  | "major_diff_oases_match" // diff > 5 mins, oases matches util → highlight, check techlog
  | "major_diff" // diff > 5 mins, flagged
  | "wingtrac_only" // in wingtrac, not in oases → yellow highlight, fill with wingtrac
  | "oases_only" // in oases, not in wingtrac → flag for review
  | "missing_techlog"; // techlog missing

export interface UtilisationEntry {
  date: string; // YYYY-MM-DD
  day: number;
  sectors: SectorEntry[];
  totalMin: number;
  totalHrs: number;
  totalCycles: number;
}

export interface SectorEntry {
  sectorIndex: number; // 1-based
  minutes: number;
  source: "oases" | "wingtrac" | "existing";
  flag: FlagType;
  oasesMinutes?: number;
  wingtracMinutes?: number;
  techLogPage?: number;
  flightNo?: number | null;
  route?: string;
  comment?: string;
}

export interface QCResult {
  aircraft: string;
  month: string;
  entries: UtilisationEntry[];
  summary: {
    total: number;
    ok: number;
    flagged: number;
    wingtracOnly: number;
    oasesOnly: number;
    majorDiff: number;
  };
}

export interface StoredUtilisation {
  aircraft: string; // e.g. "5Y-JXL"
  month: string; // e.g. "MAY-2026"
  uploadedAt: string;
  entries: UtilisationEntry[];
}
