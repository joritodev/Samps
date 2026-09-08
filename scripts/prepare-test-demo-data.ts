/**
 * Enriquece o banco atual para teste da empresa — NÃO apaga dados.
 * - Upsert tipos de vídeo (demo)
 * - Cria anexos Drive demo visíveis ao cliente
 * - Recalcula Top 5 por setor
 *
 * Uso: npx tsx scripts/prepare-test-demo-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { VIDEO_DEMO_CONTENT_TYPES } from "../lib/agency/video-demo-briefing";
import { recalculateSectorPriorities } from "../lib/services/priority.service";

const prisma = new PrismaClient();

async function main() {
  console.log("Preparando dados demo para teste…");

  for (const ct of VIDEO_DEMO_CONTENT_TYPES) {
    await prisma.contentType.upsert({
      where: { slug: ct.slug },
      create: { name: ct.name, slug: ct.slug, sortOrder: ct.sortOrder, isActive: true },
      update: { name: ct.name, sortOrder: ct.sortOrder, isActive: true },
    });
  }
  console.log(`  Content types demo: ${VIDEO_DEMO_CONTENT_TYPES.length}`);

  const bella = await prisma.client.findFirst({
    where: { name: { contains: "Bella" } },
    select: { id: true },
  });
  const sorriso = await prisma.client.findFirst({
    where: { name: { contains: "Sorriso" } },
    select: { id: true },
  });

  const demands = await prisma.demand.findMany({
    where: {
      OR: [
        bella ? { clientId: bella.id, materialUrl: { not: null } } : undefined,
        sorriso ? { clientId: sorriso.id, status: "IN_REVIEW" } : undefined,
      ].filter(Boolean) as { clientId: string }[],
    },
    select: { id: true, clientId: true, title: true, materialUrl: true },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });

  let created = 0;
  for (const d of demands) {
    const url =
      d.materialUrl ??
      `https://drive.google.com/demo/${encodeURIComponent(d.title.slice(0, 40))}`;
    const existing = await prisma.attachment.findFirst({
      where: { demandId: d.id, name: { contains: "(demo)" } },
    });
    if (existing) continue;
    await prisma.attachment.create({
      data: {
        demandId: d.id,
        clientId: d.clientId,
        name: `Material — ${d.title.slice(0, 48)} (demo)`,
        url,
        fileType: "link",
        visibleToClient: true,
        entityType: "Demand",
        entityId: d.id,
      },
    });
    created += 1;
  }
  console.log(`  Anexos Drive criados: ${created}`);

  const sectors = await prisma.sector.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });
  for (const s of sectors) {
    await recalculateSectorPriorities(s.id);
    console.log(`  Top 5 recalculado: ${s.slug}`);
  }

  const [attachments, scores, demoTypes] = await Promise.all([
    prisma.attachment.count(),
    prisma.priorityScore.count(),
    prisma.contentType.count({
      where: { slug: { in: VIDEO_DEMO_CONTENT_TYPES.map((c) => c.slug) } },
    }),
  ]);

  console.log("\nResumo:");
  console.log(`  attachments=${attachments} scores=${scores} videoDemoTypes=${demoTypes}`);
  console.log("Pronto.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
