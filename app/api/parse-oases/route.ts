import { NextRequest, NextResponse } from "next/server";
import { parseOasesFile } from "@/lib/parseOases";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rows = parseOasesFile(buffer);

    // Extract unique dates and month
    const dates = [...new Set(rows.map((r) => r.departureDate))].sort();
    const month = dates.length > 0 ? dates[0].substring(0, 7) : "";

    return NextResponse.json({
      rows,
      totalFlights: rows.length,
      dates,
      month,
    });
  } catch (err) {
    console.error("Oases parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse Oases file: " + String(err) },
      { status: 500 }
    );
  }
}
