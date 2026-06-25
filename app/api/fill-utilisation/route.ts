import { NextRequest, NextResponse } from "next/server";
import { parseOasesFile } from "@/lib/parseOases";
import { fillUtilisationFromOases } from "@/lib/qcEngine";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const oasesFile = formData.get("oasesFile") as File | null;
    const aircraft = formData.get("aircraft") as string | null;
    const month = formData.get("month") as string | null;

    if (!oasesFile || !aircraft || !month) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const oasesBuffer = Buffer.from(await oasesFile.arrayBuffer());
    const oasesRows = parseOasesFile(oasesBuffer);
    const entries = fillUtilisationFromOases(oasesRows, month, aircraft);

    return NextResponse.json({
      entries,
      totalFlights: entries.reduce((s, e) => s + e.sectors.length, 0),
    });
  } catch (err) {
    console.error("Fill error:", err);
    return NextResponse.json(
      { error: "Failed to fill utilisation: " + String(err) },
      { status: 500 }
    );
  }
}
