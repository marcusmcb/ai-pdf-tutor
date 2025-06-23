import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
  // Enhanced logging for all incoming requests
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const method = req.method;
  const url = req.url;
  const headers = Object.fromEntries(req.headers.entries());
  let bodyText = "";
  let filename = undefined;
  try {
    bodyText = await req.text();
    try {
      const body = JSON.parse(bodyText);
      filename = body.filename;
    } catch (jsonErr) {
      console.error("[extract-text] Failed to parse JSON body:", bodyText, jsonErr);
    }
    console.log("[extract-text] Incoming request", { method, url, ip, headers, filename });
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing or invalid filename." }, { status: 400 });
    }
    // Only use the base filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const pdfPath = path.join(process.cwd(), "public", "uploads", safeFilename);
    try {
      await fs.access(pdfPath);
    } catch {
      console.warn(`[extract-text] File not found: ${safeFilename} (requested by IP: ${ip})`);
      return NextResponse.json({ error: `File not found: ${safeFilename}` }, { status: 404 });
    }
    const fileBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(fileBuffer);
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error("[extract-text] Error:", error, { method, url, ip, headers, filename, bodyText });
    return NextResponse.json({ error: error.message || "Failed to extract PDF text." }, { status: 500 });
  }
}
