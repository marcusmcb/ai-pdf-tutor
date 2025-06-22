import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const pdfs = await prisma.pDF.findMany();
  for (const pdf of pdfs) {
    const base = path.basename(pdf.filename);
    if (pdf.filename !== base) {
      await prisma.pDF.update({
        where: { id: pdf.id },
        data: { filename: base },
      });
      console.log(`Updated PDF id=${pdf.id}: filename -> ${base}`);
    }
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
