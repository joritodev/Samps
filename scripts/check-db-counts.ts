import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [users, demands, attachments, scores, contentTypes] = await Promise.all([
    prisma.user.count(),
    prisma.demand.count(),
    prisma.attachment.count(),
    prisma.priorityScore.count(),
    prisma.contentType.findMany({ select: { name: true, slug: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  console.log(
    JSON.stringify({ users, demands, attachments, scores, contentTypes }, null, 2)
  );
}

main()
  .catch((e) => {
    console.error("DB_ERR", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
