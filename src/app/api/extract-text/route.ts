import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
// @ts-ignore
import extract from "pdf-text-extract";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_PDF_CHARS = 8000; // Limit for OpenAI prompt

export async function POST(req: NextRequest) {
  // Enhanced logging for all incoming requests
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const method = req.method;
  const url = req.url;
  const headers = Object.fromEntries(req.headers.entries());
  let bodyText = "";
  let filename = undefined;
  let question = undefined;
  try {
    bodyText = await req.text();
    try {
      const body = JSON.parse(bodyText);
      filename = body.filename;
      question = body.question;
    } catch (jsonErr) {
      console.error("[extract-text] Failed to parse JSON body:", bodyText, jsonErr);
    }
    console.log("[extract-text] Incoming request", { method, url, ip, headers, filename, question });
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing or invalid filename." }, { status: 400 });
    }
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing or invalid question." }, { status: 400 });
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
    // Extract text using pdf-text-extract
    const text: string = await new Promise((resolve, reject) => {
      extract(pdfPath, (err: any, pages: string[]) => {
        if (err) return reject(err);
        resolve(pages.join("\n"));
      });
    });
    // Handle large PDFs gracefully
    let truncated = false;
    let pdfContent = text;
    if (text.length > MAX_PDF_CHARS) {
      pdfContent = text.slice(0, MAX_PDF_CHARS);
      truncated = true;
    }
    // Compose prompt for OpenAI
    const prompt = `You are an AI assistant. Answer the user's question based only on the following PDF content.\n\nPDF Content:${truncated ? " (truncated)" : ""}\n${pdfContent}\n\nQuestion: ${question}\nAnswer:`;
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an AI assistant that answers questions about PDF documents." },
        { role: "user", content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.2
    });
    const aiAnswer = completion.choices[0]?.message?.content || "No answer generated.";
    return NextResponse.json({ text: aiAnswer });
  } catch (error: any) {
    console.error("[extract-text] Error:", error, { method, url, ip, headers, filename, bodyText });
    return NextResponse.json({ error: error.message || "Failed to extract PDF text or get AI answer." }, { status: 500 });
  }
}
