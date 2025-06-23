const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Delete all PDFs with a slash or backslash in the filename
  const deleted = await prisma.PDF.deleteMany({
    where: {
      OR: [
        { filename: { contains: '/' } },
        { filename: { contains: '\\' } },
      ],
    },
  });
  console.log(`Deleted ${deleted.count} PDFs with path-like filenames.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
