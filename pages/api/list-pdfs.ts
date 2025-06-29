import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../src/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pdfs: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Always return only the base filename for each PDF
    const pdfs = user.pdfs.map((pdf: any) => ({
      ...pdf,
      filename: path.basename(pdf.filename),
    }));
    return res.status(200).json({ pdfs });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch PDFs" });
  }
}
