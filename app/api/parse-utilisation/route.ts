import { NextRequest, NextResponse } from "next/server";
import { parseUtilisationTemplate } from "@/lib/parseUtilisation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = parseUtilisationTemplate(buffer);

    return NextResponse.json({
      sheetNames: result.sheetNames,
      entriesByAircraft: result.entriesByAircraft,
    });
  } catch (err) {
    console.error("Utilisation parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse Utilisation file: " + String(err) },
      { status: 500 }
    );
  }
}
