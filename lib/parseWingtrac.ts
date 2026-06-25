import { WingtracRow } from "@/types";

function parseWingtracDate(dateStr: string): string {
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  const match = dateStr.toUpperCase().match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (!match) return dateStr;
  return `20${match[3]}-${months[match[2]] ?? "01"}-${match[1]}`;
}

export function parseWingtracFile(content: string): WingtracRow[] {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse quoted CSV properly
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const tailCol   = col("tail");
  const airlineCol = col("airline");
  const flightCol = col("flight");
  const depCol    = col("dep");
  const arrCol    = col("arr");
  const dateCol   = col("date");
  const ofbCol    = col("ofb");
  const onbCol    = col("onb");
  const stimeCol  = col("stime");
  const atimeCol  = col("atime");
  const airboneCol = col("airbone");

  const rows: WingtracRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 5) continue;

    const flight = parts[flightCol] ?? "";

    // Skip maintenance entries (no AIRBONE value means no flight)
    if (flight.toUpperCase().includes("MAINTENANCE")) continue;

    // Accept any non-empty flight ID (including e.g. "8717D")
    if (!flight || flight === "") continue;

    const dateRaw = parts[dateCol] ?? "";
    if (!dateRaw) continue;

    const parsedDate = parseWingtracDate(dateRaw);

    const airboneRaw = parts[airboneCol] ?? "";
    const airbone = airboneRaw !== "" ? parseFloat(airboneRaw) : null;

    // Include rows even with no AIRBONE — caller decides how to handle them
    const ofbRaw = parts[ofbCol] ?? "";
    const onbRaw = parts[onbCol] ?? "";

    rows.push({
      tail:       parts[tailCol] ?? "",
      airline:    parts[airlineCol] ?? "",
      flight,
      dep:        parts[depCol] ?? "",
      arr:        parts[arrCol] ?? "",
      date:       dateRaw,
      parsedDate,
      ofb:        ofbRaw !== "" ? parseFloat(ofbRaw) : null,
      onb:        onbRaw !== "" ? parseFloat(onbRaw) : null,
      stime:      parseInt(parts[stimeCol] ?? "0", 10) || 0,
      atime:      parts[atimeCol] !== "" ? parseFloat(parts[atimeCol]) : null,
      airbone,
    });
  }

  return rows;
}
