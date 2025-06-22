import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../src/app/api/auth/[...nextauth]/route";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const sessionAny = session as any;
  if (!sessionAny || !sessionAny.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing PDF id" });
  }

  try {
    const pdf = await prisma.PDF.findUnique({ where: { id } });
    if (!pdf) return res.status(404).json({ error: "PDF not found" });
    // Only allow deleting user's own PDFs
    const user = await prisma.user.findUnique({ where: { email: sessionAny.user.email } });
    if (!user || pdf.userId !== user.id) return res.status(403).json({ error: "Forbidden" });
    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", "uploads", pdf.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    // Delete from DB
    await prisma.PDF.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete PDF" });
  }
}
