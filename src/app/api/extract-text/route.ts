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
    // Compose system and user prompts for OpenAI
    const systemPrompt = `
You are an AI assistant that answers questions about PDF documents.
- You MUST always quote the exact text from the PDF that answers the question, and wrap it in [[HIGHLIGHT]]...[[/HIGHLIGHT]].
- The highlighted text should be the answer content, NOT the page number or location.
- After the highlighted text, always say 'See page X' (where X is the page number).
- Do NOT paraphrase or summarize the highlighted text. Copy it exactly as it appears in the PDF.
- If you cannot find an answer, say "No answer found in the PDF."
- Example: The answer is [[HIGHLIGHT]]This is the relevant text from the PDF[[/HIGHLIGHT]]. See page 5.
`;
    const userPrompt = `PDF Content:${truncated ? " (truncated)" : ""}\n${pdfContent}\n\nQuestion: ${question}\n`;
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 512,
      temperature: 0.1
    });
    const aiAnswer = completion.choices[0]?.message?.content || "No answer generated.";
    // Log the full AI response for debugging
    console.log("[extract-text] AI raw response:", aiAnswer);
    // Extract page number from AI answer (e.g., 'See page 5')
    let page = null;
    const match = aiAnswer.match(/see page (\d+)/i);
    if (match) {
      page = parseInt(match[1], 10);
    }
    // Extract highlighted text from AI answer
    let highlightText = null;
    let pages: string[] = [];
    // Extract text using pdf-text-extract and keep pages array for logging
    try {
      pages = await new Promise<string[]>((resolve, reject) => {
        extract(pdfPath, (err, pgs) => {
          if (err) return reject(err);
          resolve(pgs);
        });
      });
    } catch (err) {
      console.error('[extract-text] Error extracting pages:', err);
    }
    const highlightMatch = aiAnswer.match(/\[\[HIGHLIGHT\]\]([\s\S]*?)\[\[\/HIGHLIGHT\]\]/i);
    if (highlightMatch) {
      // Normalize whitespace for better matching
      const fullHighlight = highlightMatch[1].replace(/\s+/g, ' ').trim();
      // Ignore highlights that look like a page number/location
      if (/^page \d+( of \d+)?$/i.test(fullHighlight)) {
        console.warn('[extract-text] Ignoring highlight that looks like a page/location:', fullHighlight);
      } else if (page && pages[page - 1]) {
        // Try to find the exact highlight in the PDF page text
        const pageTextRaw = pages[page - 1];
        const pageText = pageTextRaw.replace(/\s+/g, ' ').trim();
        const lowerPageText = pageText.toLowerCase();
        const lowerHighlight = fullHighlight.toLowerCase();
        if (lowerPageText.includes(lowerHighlight)) {
          highlightText = fullHighlight;
          console.log('[extract-text] Exact highlight found in page text:', highlightText);
        } else {
          // Try to expand the highlight to cover multi-line content
          // Split both highlight and page text into lines
          const highlightWords = fullHighlight.split(' ');
          const pageLines = pageTextRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          // Find all lines that contain any of the highlight's first 3 words (to anchor the start)
          let startIdx = -1, endIdx = -1;
          for (let i = 0; i < pageLines.length; i++) {
            const line = pageLines[i].replace(/\s+/g, ' ').toLowerCase();
            if (highlightWords.slice(0, 3).every(w => line.includes(w.toLowerCase()))) {
              startIdx = i;
              break;
            }
          }
          // Find the last line that contains any of the last 3 words
          for (let i = pageLines.length - 1; i >= 0; i--) {
            const line = pageLines[i].replace(/\s+/g, ' ').toLowerCase();
            if (highlightWords.slice(-3).every(w => line.includes(w.toLowerCase()))) {
              endIdx = i;
              break;
            }
          }
          if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
            // Join all lines between startIdx and endIdx
            highlightText = pageLines.slice(startIdx, endIdx + 1).join(' ');
            console.log('[extract-text] Multi-line highlight constructed:', highlightText);
          } else {
            // Fallback to previous logic: longest matching substring
            const words = fullHighlight.split(' ');
            let found = false;
            for (let len = Math.min(6, words.length); len >= 3; len--) {
              for (let start = 0; start <= words.length - len; start++) {
                const candidate = words.slice(start, start + len).join(' ');
                if (lowerPageText.includes(candidate.toLowerCase())) {
                  highlightText = candidate;
                  found = true;
                  console.log(`[extract-text] Partial highlight found (length ${len}):`, highlightText);
                  break;
                }
              }
              if (found) break;
            }
            if (!found) {
              // Fallback: use first 6 words
              highlightText = words.slice(0, 6).join(' ');
              console.warn('[extract-text] No highlight match found, using fallback:', highlightText);
            }
          }
        }
      } else {
        // Fallback: use first 6 words
        const words = fullHighlight.split(' ');
        highlightText = words.slice(0, 6).join(' ');
        console.warn('[extract-text] No page or page text, using fallback:', highlightText);
      }
    }
    // Log the actual PDF text for the referenced page for debugging
    if (page && pages[page - 1]) {
      console.log(`[extract-text] PDF text for page ${page}:`, pages[page - 1]);
    }
    // Fallbacks if AI does not follow instructions
    if (!highlightText) {
      // Use first 5 words of the question as a fallback
      highlightText = question ? question.split(' ').slice(0, 5).join(' ') : null;
    }
    if (!page) {
      page = 1; // fallback to first page
    }
    return NextResponse.json({ text: aiAnswer, page, highlightText });
  } catch (error: any) {
    console.error("[extract-text] Error:", error, { method, url, ip, headers, filename, bodyText });
    return NextResponse.json({ error: error.message || "Failed to extract PDF text or get AI answer." }, { status: 500 });
  }
}
