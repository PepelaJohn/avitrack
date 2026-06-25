import * as XLSX from "xlsx";
import { UtilisationEntry, SectorEntry } from "@/types";

export function parseUtilisationTemplate(buffer: Buffer): {
  sheetNames: string[];
  entriesByAircraft: Record<string, UtilisationEntry[]>;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const aircraftSheets = workbook.SheetNames.filter((name) =>
    name.match(/^5Y-JX/)
  );

  const entriesByAircraft: Record<string, UtilisationEntry[]> = {};

  for (const sheetName of aircraftSheets) {
    const ws = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
    }) as unknown[][];

    const entries: UtilisationEntry[] = [];

    // Rows 5–35 (index 4–34) are the data rows (days 1-31)
    for (let i = 4; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const dateVal = row[1];
      if (!dateVal) continue;

      let date: Date | null = null;
      if (dateVal instanceof Date) {
        date = dateVal;
      } else if (typeof dateVal === "number") {
        const parsed = XLSX.SSF.parse_date_code(dateVal);
        if (parsed) date = new Date(parsed.y, parsed.m - 1, parsed.d);
      }

      if (!date) continue;
      const dateStr = date.toISOString().split("T")[0];
      const day = date.getDate();

      // Cols C–N (index 2–13) are sectors 1–12
      const sectors: SectorEntry[] = [];
      for (let s = 0; s < 12; s++) {
        const val = row[2 + s];
        if (val !== null && val !== undefined && !isNaN(Number(val))) {
          sectors.push({
            sectorIndex: s + 1,
            minutes: Number(val),
            source: "existing",
            flag: "ok",
          });
        }
      }

      const totalMin = sectors.reduce((sum, s) => sum + s.minutes, 0);

      entries.push({
        date: dateStr,
        day,
        sectors,
        totalMin,
        totalHrs: totalMin / 60,
        totalCycles: sectors.length,
      });
    }

    entriesByAircraft[sheetName] = entries;
  }

  return {
    sheetNames: aircraftSheets,
    entriesByAircraft,
  };
}

export function generateFilledUtilisationExcel(
  templateBuffer: Buffer,
  aircraft: string,
  entries: UtilisationEntry[]
): Buffer {
  const workbook = XLSX.read(templateBuffer, { type: "buffer", cellDates: true });
  const ws = workbook.Sheets[aircraft];

  if (!ws) throw new Error(`Sheet ${aircraft} not found`);

  // Rows start at index 4 (row 5 in Excel = day 1 of month)
  for (const entry of entries) {
    const rowIdx = entry.day + 3; // day 1 = row 5 = excel row index 4 (0-based) → xlsx row = rowIdx+1
    const excelRow = entry.day + 4; // 1-indexed excel row

    // Clear sector cols C–N first
    for (let s = 0; s < 12; s++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 2 + s });
      if (ws[cellAddr]) {
        ws[cellAddr] = { t: "z", v: undefined };
      }
    }

    // Fill in sector values
    for (const sector of entry.sectors) {
      const colIdx = 2 + (sector.sectorIndex - 1);
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });

      ws[cellAddr] = {
        t: "n",
        v: sector.minutes,
        s:
          sector.flag === "wingtrac_only"
            ? { fill: { fgColor: { rgb: "FFFF00" }, patternType: "solid" } }
            : sector.flag === "major_diff_oases_match" ||
              sector.flag === "major_diff"
            ? { fill: { fgColor: { rgb: "FF9999" }, patternType: "solid" } }
            : undefined,
      };
    }

    // Add comments for flagged cells
    if (!ws["!comments"]) ws["!comments"] = [];
    for (const sector of entry.sectors) {
      if (sector.comment) {
        const colIdx = 2 + (sector.sectorIndex - 1);
        const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        (ws["!comments"] as unknown[]).push({
          ref: cellAddr,
          a: "AviTrack",
          t: sector.comment,
        });
      }
    }
  }

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
