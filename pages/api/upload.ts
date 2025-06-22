import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import formidable, { Fields, Files, File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../src/app/api/auth/[...nextauth]/route";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  // Patch: treat session as any to access user.email
  const sessionAny = session as any;
  if (!sessionAny || !sessionAny.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const form = formidable({ multiples: false });
  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      return res.status(400).json({ error: "Failed to parse form data" });
    }
    let file: FormidableFile | undefined;
    const pdfField = files.pdf;
    if (Array.isArray(pdfField)) {
      file = pdfField[0];
    } else if (pdfField) {
      file = pdfField;
    }
    if (!file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    // Always use only the base filename
    const fileName = path.basename(file.originalFilename || file.newFilename || "uploaded.pdf");
    const filePath = path.join(uploadDir, fileName);
    fs.copyFileSync(file.filepath, filePath);
    const user = await prisma.user.findUnique({ where: { email: sessionAny.user.email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await prisma.PDF.create({
      data: {
        userId: user.id,
        filename: fileName,
        url: `/uploads/${fileName}`,
        uploadedAt: new Date(),
      },
    });
    return res.status(200).json({ success: true });
  });
}
