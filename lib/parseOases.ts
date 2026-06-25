import * as XLSX from "xlsx";
import { OasesRow } from "@/types";

function parseDuration(duration: string): number {
  if (!duration || duration === "00:00:00") return 0;
  const parts = duration.split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function parseExcelDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return val;
  }
  return String(val);
}

function parseTimeVal(val: unknown): string {
  if (!val) return "00:00:00";
  if (val instanceof Date) {
    return val.toTimeString().substring(0, 8);
  }
  if (typeof val === "number") {
    // Excel time fraction
    const totalSeconds = Math.round(val * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return String(val);
}

export function parseOasesFile(buffer: Buffer): OasesRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];

  if (raw.length < 2) return [];

  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i] as unknown[];
    if (row.some((c) => typeof c === "string" && c.toLowerCase().includes("departure"))) {
      headerIdx = i;
      break;
    }
  }

  const headers = (raw[headerIdx] as string[]).map((h) =>
    String(h || "").replace(/\n/g, " ").trim().toLowerCase()
  );

  const colIdx = (name: string) =>
    headers.findIndex((h) => h.includes(name));

  const dateCol = colIdx("departure date");
  const deptCol = colIdx("dept");
  const arrvCol = colIdx("arrv");
  const techLogCol = colIdx("tech log");
  const woCol = colIdx("w/o");
  const sectorCol = colIdx("sector");
  const durationCol = colIdx("durtn");
  const landingsCol = colIdx("landings");
  const flightNoCol = colIdx("flight");

  const rows: OasesRow[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row[dateCol]) continue;

    const durationStr = parseTimeVal(row[durationCol]);
    const durationMinutes = parseDuration(durationStr);

    // Only include actual flights (duration > 0 and has landings)
    const landings = Number(row[landingsCol]) || 0;
    if (durationMinutes === 0 && landings === 0) continue;
    if (durationMinutes === 0) continue;

    const flightNoRaw = row[flightNoCol];
    const flightNo =
      flightNoRaw != null && !isNaN(Number(flightNoRaw))
        ? Number(flightNoRaw)
        : null;

    rows.push({
      departureDate: parseExcelDate(row[dateCol]),
      deptTime: parseTimeVal(row[deptCol]),
      arrvTime: parseTimeVal(row[arrvCol]),
      techLogPage: Number(row[techLogCol]) || 0,
      workOrder: row[woCol] != null ? Number(row[woCol]) : null,
      sectorId: String(row[sectorCol] || ""),
      duration: durationStr,
      durationMinutes,
      landings,
      flightNo,
    });
  }

  return rows;
}
