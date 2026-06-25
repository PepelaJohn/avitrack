import { NextRequest, NextResponse } from "next/server";
import { parseOasesFile } from "@/lib/parseOases";
import { parseWingtracFile } from "@/lib/parseWingtrac";
import { fillUtilisationFromOases, runQC } from "@/lib/qcEngine";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const oasesFile = formData.get("oasesFile") as File | null;
    const wingtracFile = formData.get("wingtracFile") as File | null;
    const aircraft = formData.get("aircraft") as string | null;
    const month = formData.get("month") as string | null;

    if (!oasesFile || !wingtracFile || !aircraft || !month) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const oasesBuffer = Buffer.from(await oasesFile.arrayBuffer());
    const wingtracText = await wingtracFile.text();

    const oasesRows = parseOasesFile(oasesBuffer);
    const wingtracRows = parseWingtracFile(wingtracText);

    const utilisationEntries = fillUtilisationFromOases(oasesRows, month, aircraft);
    const qcResult = runQC(utilisationEntries, wingtracRows, oasesRows, aircraft, month);

    return NextResponse.json({ qcResult });
  } catch (err) {
    console.error("QC error:", err);
    return NextResponse.json(
      { error: "Failed to run QC: " + String(err) },
      { status: 500 }
    );
  }
}
