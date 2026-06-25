import { OasesRow, WingtracRow, UtilisationEntry, SectorEntry, QCResult, FlagType } from "@/types";

const MAJOR_DIFF_THRESHOLD = 5;

/**
 * Step 1: Fill utilisation entries from Oases data for a given aircraft + month.
 * Flights sorted by departure time, filled into sectors sequentially.
 */
export function fillUtilisationFromOases(
  oasesRows: OasesRow[],
  month: string, // e.g. "2026-05"
  _aircraft: string
): UtilisationEntry[] {
  const byDate: Record<string, OasesRow[]> = {};

  for (const row of oasesRows) {
    if (!row.departureDate.startsWith(month)) continue;
    if (row.durationMinutes === 0) continue;
    if (!byDate[row.departureDate]) byDate[row.departureDate] = [];
    byDate[row.departureDate].push(row);
  }

  const entries: UtilisationEntry[] = [];

  for (const [date, flights] of Object.entries(byDate)) {
    const sorted = [...flights].sort((a, b) => a.deptTime.localeCompare(b.deptTime));

    const sectors: SectorEntry[] = sorted.map((f, idx) => ({
      sectorIndex: idx + 1,
      minutes: f.durationMinutes,
      source: "oases" as const,
      flag: "ok" as FlagType,
      oasesMinutes: f.durationMinutes,
      techLogPage: f.techLogPage,
      flightNo: f.flightNo,
      route: f.sectorId,
    }));

    const totalMin = sectors.reduce((s, e) => s + e.minutes, 0);
    const [, , day] = date.split("-").map(Number);

    entries.push({
      date,
      day,
      sectors,
      totalMin,
      totalHrs: totalMin / 60,
      totalCycles: sectors.length,
    });
  }

  return entries.sort((a, b) => a.day - b.day);
}

/**
 * Step 2: QC — Wingtrac is the source of truth for WHICH flights happened and on which day.
 * We compare the Wingtrac AIRBONE minutes against the Oases-filled utilisation values.
 *
 * Aircraft: utilisationSheet "5Y-JXL" → Wingtrac TAIL "JXL"
 *
 * Logic per day:
 *  - Wingtrac defines the sector count for the day (it always has entries from Ops).
 *  - Flights matched sequentially by departure order (OFB ascending in Wingtrac,
 *    deptTime ascending in Oases).
 *  - If diff ≤ 5 min → OK, use Oases value (more accurate, from techlog).
 *  - If diff > 5 min → flag "CHECK TECHLOG", highlight red.
 *  - Flight in Wingtrac only (not in Oases yet) → fill with Wingtrac AIRBONE, highlight yellow.
 *  - Flight in Oases only (no Wingtrac counterpart) → flag "OASES ONLY" for review.
 *  - Wingtrac row has no AIRBONE → flag as MISSING (ATIME is block time, not a valid substitute).
 */
export function runQC(
  utilisationEntries: UtilisationEntry[],
  wingtracRows: WingtracRow[],
  oasesRows: OasesRow[],
  aircraft: string, // e.g. "5Y-JXL"
  month: string    // e.g. "2026-05"
): QCResult {
  // Map aircraft sheet name → Wingtrac TAIL: "5Y-JXL" → "JXL"
  const tail = aircraft.replace(/^5Y-/, "");

  // Filter + group Wingtrac rows for this tail + month
  // Include ALL non-maintenance flights (even those with no AIRBONE, for positional matching)
  const wtAll = wingtracRows.filter(
    (w) =>
      w.tail.toUpperCase() === tail.toUpperCase() &&
      w.parsedDate.startsWith(month) &&
      !w.flight.toUpperCase().includes("MAINTENANCE")
  );

  const wtByDate: Record<string, WingtracRow[]> = {};
  for (const w of wtAll) {
    if (!wtByDate[w.parsedDate]) wtByDate[w.parsedDate] = [];
    wtByDate[w.parsedDate].push(w);
  }
  // Sort each day by OFB (off-block time) ascending — this defines sector order
  for (const date of Object.keys(wtByDate)) {
    wtByDate[date].sort((a, b) => (a.ofb ?? 0) - (b.ofb ?? 0));
  }

  // Build Oases lookup by date (already sorted by deptTime from fillUtilisationFromOases)
  const oasesByDate: Record<string, OasesRow[]> = {};
  for (const row of oasesRows) {
    if (!row.departureDate.startsWith(month) || row.durationMinutes === 0) continue;
    if (!oasesByDate[row.departureDate]) oasesByDate[row.departureDate] = [];
    oasesByDate[row.departureDate].push(row);
  }
  for (const date of Object.keys(oasesByDate)) {
    oasesByDate[date].sort((a, b) => a.deptTime.localeCompare(b.deptTime));
  }

  // The master set of dates is driven by Wingtrac (it always has entries)
  // We also include any Oases-only dates
  const allDates = new Set<string>([
    ...Object.keys(wtByDate),
    ...Object.keys(oasesByDate),
  ]);

  const updatedEntries: UtilisationEntry[] = [];
  let totalOk = 0, totalFlagged = 0, totalWingtracOnly = 0, totalOasesOnly = 0, totalMajorDiff = 0;

  for (const date of [...allDates].sort()) {
    const wtFlights = wtByDate[date] ?? [];
    const oasesFlights = oasesByDate[date] ?? [];

    // ── Case: Oases has flights but Wingtrac has none for this date ──
    // (shouldn't happen per your spec, but handle gracefully)
    if (wtFlights.length === 0 && oasesFlights.length > 0) {
      const [, , dayN] = date.split("-").map(Number);
      const sectors: SectorEntry[] = oasesFlights.map((f, idx) => ({
        sectorIndex: idx + 1,
        minutes: f.durationMinutes,
        source: "oases" as const,
        flag: "oases_only" as FlagType,
        oasesMinutes: f.durationMinutes,
        techLogPage: f.techLogPage,
        flightNo: f.flightNo,
        route: f.sectorId,
        comment: `Oases only — no Wingtrac record for this day/flight. Flt ${f.flightNo ?? "?"} ${f.sectorId} ${f.durationMinutes} min.`,
      }));
      const totalMin = sectors.reduce((s, e) => s + e.minutes, 0);
      totalOasesOnly += sectors.length;
      updatedEntries.push({ date, day: dayN, sectors, totalMin, totalHrs: totalMin / 60, totalCycles: sectors.length });
      continue;
    }

    // ── Normal case: Wingtrac has flights (the ground truth for sector count) ──
    const [, , dayN] = date.split("-").map(Number);
    const maxSectors = Math.max(wtFlights.length, oasesFlights.length);
    const updatedSectors: SectorEntry[] = [];

    for (let i = 0; i < maxSectors; i++) {
      const wt = wtFlights[i];
      const oa = oasesFlights[i];

      // ── Wingtrac has a flight, Oases does not ──
      if (wt && !oa) {
        // Only use AIRBONE — ATIME is block time, not airborne time
        const wtMin = wt.airbone ?? null;
        if (wtMin !== null && wtMin > 0) {
          updatedSectors.push({
            sectorIndex: i + 1,
            minutes: Math.round(wtMin),
            source: "wingtrac",
            flag: "wingtrac_only",
            wingtracMinutes: Math.round(wtMin),
            route: `${wt.dep}-${wt.arr}`,
            flightNo: parseInt(wt.flight, 10) || null,
            comment: `Wingtrac only — not yet in Oases. Flt ${wt.flight} ${wt.dep}-${wt.arr}: ${Math.round(wtMin)} min AIRBONE. Highlighted yellow — review once entered in Oases.`,
          });
          totalWingtracOnly++;
        } else {
          // Flight exists in Wingtrac but AIRBONE is missing
          updatedSectors.push({
            sectorIndex: i + 1,
            minutes: 0,
            source: "wingtrac",
            flag: "missing_techlog",
            wingtracMinutes: 0,
            route: `${wt.dep}-${wt.arr}`,
            flightNo: parseInt(wt.flight, 10) || null,
            comment: `Flt ${wt.flight} ${wt.dep}-${wt.arr}: AIRBONE missing in Wingtrac. Not yet in Oases either. Check with Ops.`,
          });
          totalFlagged++;
        }
        continue;
      }

      // ── Oases has a flight, Wingtrac does not ──
      if (oa && !wt) {
        updatedSectors.push({
          sectorIndex: i + 1,
          minutes: oa.durationMinutes,
          source: "oases",
          flag: "oases_only",
          oasesMinutes: oa.durationMinutes,
          techLogPage: oa.techLogPage,
          flightNo: oa.flightNo,
          route: oa.sectorId,
          comment: `Oases only — Flt ${oa.flightNo ?? "?"} ${oa.sectorId} ${oa.durationMinutes} min. No Wingtrac counterpart at this position. Verify sector count.`,
        });
        totalOasesOnly++;
        continue;
      }

      // ── Both have this sector ──
      const oasesMin = oa!.durationMinutes;

      // Only compare against AIRBONE — ATIME is block time and not a valid substitute
      const wtRawMin = wt!.airbone;

      if (wtRawMin === null || wtRawMin === undefined) {
        // Wingtrac row exists but AIRBONE is missing — flag it
        updatedSectors.push({
          sectorIndex: i + 1,
          minutes: oasesMin,
          source: "oases",
          flag: "missing_techlog",
          oasesMinutes: oasesMin,
          wingtracMinutes: undefined,
          techLogPage: oa!.techLogPage,
          flightNo: oa!.flightNo,
          route: oa!.sectorId,
          comment: `Flt ${wt!.flight} ${wt!.dep}-${wt!.arr}: AIRBONE missing in Wingtrac. Showing Oases value ${oasesMin} min — verify against techlog page ${oa!.techLogPage ?? "?"}.`,
        });
        totalFlagged++;
        continue;
      }

      const wtMin = Math.round(wtRawMin);
      const diff = Math.abs(oasesMin - wtMin);

      if (diff <= MAJOR_DIFF_THRESHOLD) {
        // Small or zero difference — OK, use Oases (more accurate)
        updatedSectors.push({
          sectorIndex: i + 1,
          minutes: oasesMin,
          source: "oases",
          flag: "ok",
          oasesMinutes: oasesMin,
          wingtracMinutes: wtMin,
          techLogPage: oa!.techLogPage,
          flightNo: oa!.flightNo,
          route: oa!.sectorId,
          comment: diff === 0
            ? undefined
            : `Minor diff: Oases ${oasesMin} min vs Wingtrac ${wtMin} min (Δ${diff}). Within ±5 min — using Oases.`,
        });
        totalOk++;
      } else {
        // Major discrepancy — flag for techlog check
        updatedSectors.push({
          sectorIndex: i + 1,
          minutes: oasesMin, // keep Oases value, flag for verification
          source: "oases",
          flag: "major_diff_oases_match",
          oasesMinutes: oasesMin,
          wingtracMinutes: wtMin,
          techLogPage: oa!.techLogPage,
          flightNo: oa!.flightNo,
          route: oa!.sectorId,
          comment: `MAJOR DIFF — Flt ${wt!.flight} ${wt!.dep}-${wt!.arr}: Oases ${oasesMin} min vs Wingtrac ${wtMin} min (Δ${diff} min). Verify against techlog page ${oa!.techLogPage ?? "?"}.`,
        });
        totalMajorDiff++;
        totalFlagged++;
      }
    }

    const totalMin = updatedSectors.reduce((s, e) => s + e.minutes, 0);
    updatedEntries.push({
      date,
      day: dayN,
      sectors: updatedSectors,
      totalMin,
      totalHrs: totalMin / 60,
      totalCycles: updatedSectors.length,
    });
  }

  return {
    aircraft,
    month,
    entries: updatedEntries,
    summary: {
      total: updatedEntries.reduce((s, e) => s + e.sectors.length, 0),
      ok: totalOk,
      flagged: totalFlagged,
      wingtracOnly: totalWingtracOnly,
      oasesOnly: totalOasesOnly,
      majorDiff: totalMajorDiff,
    },
  };
}
