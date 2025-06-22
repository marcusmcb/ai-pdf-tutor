import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json();
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing or invalid filename." }, { status: 400 });
    }
    // Only use the base filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const pdfPath = path.join(process.cwd(), "public", "uploads", safeFilename);
    try {
      await fs.access(pdfPath);
    } catch {
      return NextResponse.json({ error: `File not found: ${safeFilename}` }, { status: 404 });
    }
    const fileBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(fileBuffer);
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to extract PDF text." }, { status: 500 });
  }
}
