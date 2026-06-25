import { NextRequest, NextResponse } from "next/server";
import { parseWingtracFile } from "@/lib/parseWingtrac";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseWingtracFile(text);

    const tails = [...new Set(rows.map((r) => r.tail))].sort();
    const dates = [...new Set(rows.map((r) => r.parsedDate))].sort();
    const month = dates.length > 0 ? dates[0].substring(0, 7) : "";

    return NextResponse.json({
      rows,
      totalFlights: rows.length,
      tails,
      dates,
      month,
    });
  } catch (err) {
    console.error("Wingtrac parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse Wingtrac file: " + String(err) },
      { status: 500 }
    );
  }
}
