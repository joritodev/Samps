/**
 * Apaga os dados operacionais e grava a simulação de um trimestre de trabalho.
 *
 *   npx tsx prisma/simulate-quarter.ts --dry-run     # só planeja e mostra o resumo
 *   npx tsx prisma/simulate-quarter.ts --yes         # APAGA e grava (irreversível)
 *
 * Preserva: usuários, funções, permissões, setores, configurações da agência,
 * tipos de conteúdo, níveis de prioridade e status de atividade. Não cria
 * contas: a equipe da simulação é quem já está ativo no sistema.
 */
import { PrismaClient, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { planQuarter, type PriorityName, type SimMember } from "../lib/agency/simulation/quarter-plan";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Samps@2026";
const CHUNK = 500;

const BASE_CONTENT_TYPES = [
  { name: "Estático", slug: "estatico", sortOrder: 1 },
  { name: "Carrossel", slug: "carrossel", sortOrder: 2 },
  { name: "Stories", slug: "stories", sortOrder: 3 },
  { name: "Reels", slug: "reels", sortOrder: 4 },
  { name: "Vídeo", slug: "video", sortOrder: 5 },
];

const BASE_PRIORITIES: { name: PriorityName; color: string; weight: number; sortOrder: number }[] = [
  { name: "Baixa", color: "#64748b", weight: 1, sortOrder: 1 },
  { name: "Média", color: "#0ea5e9", weight: 2, sortOrder: 2 },
  { name: "Alta", color: "#f97316", weight: 3, sortOrder: 3 },
  { name: "Urgente", color: "#ef4444", weight: 4, sortOrder: 4 },
];

function hostOf(url: string | undefined) {
  return url?.match(/@([^/:?]+)/)?.[1] ?? "(desconhecido)";
}

async function chunked<T>(rows: T[], write: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await write(rows.slice(i, i + CHUNK));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.argv.includes("--yes")) {
    throw new Error("Isto APAGA os dados operacionais. Rode com --dry-run para ver o plano ou --yes para aplicar.");
  }

  const [tables] = await prisma.$queryRaw<{ goal: string | null; seen: string | null; delivery: string | null }[]>`
    SELECT to_regclass('public."Goal"')::text AS goal,
           to_regclass('public."ReportSeen"')::text AS seen,
           to_regclass('public."ReportDelivery"')::text AS delivery`;
  if (!tables.goal || !tables.seen || !tables.delivery) {
    throw new Error('O banco ainda não tem as tabelas de metas/relatórios. Rode antes o workflow "Migrar banco de produção".');
  }

  // Elenco: só quem já existe e está ativo (nenhuma conta é criada).
  const sectors = await prisma.sector.findMany({ select: { id: true, slug: true } });
  const sectorId = (slug: string) => sectors.find((s) => s.slug === slug)?.id;
  const need = ["social", "design", "video"].filter((slug) => !sectorId(slug));
  if (need.length) throw new Error(`Faltam setores no sistema: ${need.join(", ")}.`);

  const users = await prisma.user.findMany({
    where: { status: UserStatus.ACTIVE, userType: { not: UserType.EXTERNAL_CLIENT } },
    select: { id: true, name: true, userType: true, sector: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  const team: SimMember[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    userType: u.userType,
    sectorSlug: u.sector?.slug ?? null,
  }));

  // Catálogos: usa os existentes e só cria o que falta nos tipos básicos.
  const contentTypeIds: Record<string, string> = {};
  for (const type of BASE_CONTENT_TYPES) {
    const row = dryRun
      ? await prisma.contentType.findUnique({ where: { slug: type.slug } })
      : await prisma.contentType.upsert({ where: { slug: type.slug }, update: {}, create: type });
    contentTypeIds[type.slug] = row?.id ?? `dry-${type.slug}`;
  }
  const priorityIds = {} as Record<PriorityName, string>;
  for (const level of BASE_PRIORITIES) {
    const row = dryRun
      ? await prisma.priorityLevel.findFirst({ where: { name: level.name } })
      : (await prisma.priorityLevel.findFirst({ where: { name: level.name } })) ??
        (await prisma.priorityLevel.create({ data: level }));
    priorityIds[level.name] = row?.id ?? `dry-${level.name}`;
  }

  const now = new Date();
  const plan = planQuarter({
    now,
    team,
    sectorIds: {
      social: sectorId("social")!,
      design: sectorId("design")!,
      video: sectorId("video")!,
      trafego: sectorId("trafego"),
    },
    contentTypeIds,
    priorityIds,
  });

  console.log(`Banco: ${hostOf(process.env.DATABASE_URL)}`);
  console.log(`Equipe usada (${team.length}): ${team.map((m) => `${m.name} [${m.userType}]`).join(", ")}`);
  console.log("Simulação planejada:", plan.summary);
  const counts = Object.fromEntries(
    Object.entries(plan).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])
  );
  console.log("Linhas a gravar:", counts);

  if (dryRun) {
    console.log("\n--dry-run: nada foi alterado.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      // Operacional: filhos antes dos pais. Usuários, perfis e catálogos ficam.
      await tx.keyResultCheckIn.deleteMany();
      await tx.keyResult.deleteMany();
      await tx.objective.deleteMany();
      await tx.goal.deleteMany();
      await tx.reportDelivery.deleteMany();
      await tx.reportSeen.deleteMany();
      await tx.announcement.deleteMany();
      await tx.agendaMeeting.deleteMany();
      await tx.absence.deleteMany();
      await tx.notification.deleteMany();
      await tx.priorityScore.deleteMany();
      await tx.workPause.deleteMany();
      await tx.workSession.deleteMany();
      await tx.demandAssignment.deleteMany();
      await tx.demandDelay.deleteMany();
      await tx.comment.deleteMany();
      await tx.attachment.deleteMany();
      await tx.externalVisibility.deleteMany();
      await tx.checklistItem.deleteMany();
      await tx.checklist.deleteMany();
      await tx.shootParticipant.deleteMany();
      await tx.shoot.deleteMany();
      await tx.projectChecklistItem.deleteMany();
      await tx.projectParticipant.deleteMany();
      await tx.userProjectLink.deleteMany();
      await tx.demand.deleteMany();
      await tx.project.deleteMany();
      await tx.clientPortal.deleteMany();
      await tx.competence.deleteMany();
      await tx.boardList.deleteMany();
      await tx.clientBoard.deleteMany();
      await tx.contractService.deleteMany();
      await tx.contract.deleteMany();
      await tx.userClientLink.deleteMany();
      await tx.client.deleteMany();

      await tx.client.createMany({ data: plan.clients });
      await tx.contract.createMany({ data: plan.contracts });
      await tx.contractService.createMany({ data: plan.services });
      await tx.clientBoard.createMany({ data: plan.boards });
      await tx.boardList.createMany({ data: plan.lists });
      await tx.competence.createMany({ data: plan.competences });
      for (const c of plan.currentCompetence) {
        await tx.clientBoard.update({ where: { id: c.boardId }, data: { currentCompetenceId: c.competenceId } });
      }
      await tx.clientPortal.createMany({ data: plan.portals });
      await tx.userClientLink.createMany({ data: plan.userClientLinks });
      await tx.project.createMany({ data: plan.projects });
      await tx.projectChecklistItem.createMany({ data: plan.projectItems });
      await tx.projectParticipant.createMany({ data: plan.projectParticipants });
      await tx.userProjectLink.createMany({ data: plan.userProjectLinks });
      await chunked(plan.demands, (data) => tx.demand.createMany({ data }));
      await chunked(plan.assignments, (data) => tx.demandAssignment.createMany({ data }));
      await chunked(plan.sessions, (data) => tx.workSession.createMany({ data }));
      await chunked(plan.pauses, (data) => tx.workPause.createMany({ data }));
      await chunked(plan.delays, (data) => tx.demandDelay.createMany({ data }));
      await chunked(plan.comments, (data) => tx.comment.createMany({ data }));
      await tx.notification.createMany({ data: plan.notifications });
      await tx.shoot.createMany({ data: plan.shoots });
      await tx.shootParticipant.createMany({ data: plan.shootParticipants });
      await tx.agendaMeeting.createMany({ data: plan.meetings });
      await tx.announcement.createMany({ data: plan.announcements });
      await tx.goal.createMany({ data: plan.goals });
      await tx.objective.createMany({ data: plan.objectives });
      await tx.keyResult.createMany({ data: plan.keyResults });
      await tx.keyResultCheckIn.createMany({ data: plan.checkIns });
    },
    { timeout: 300_000, maxWait: 60_000 }
  );

  // Top 5 de cada setor, como o sistema calcularia.
  const { recalculateSectorPriorities } = await import("../lib/services/priority.service");
  for (const s of sectors) await recalculateSectorPriorities(s.id);

  console.log("\nSimulação gravada.");

  // Aviso de segurança: contas do seed de demonstração com a senha padrão.
  const everyone = await prisma.user.findMany({ select: { email: true, passwordHash: true } });
  const weak: string[] = [];
  for (const u of everyone) {
    if (await bcrypt.compare(DEFAULT_PASSWORD, u.passwordHash)) weak.push(u.email);
  }
  if (weak.length) {
    console.warn(`\nATENÇÃO: ${weak.length} conta(s) ainda usam a senha padrão da demonstração. Troque ou desative antes de usar para valer:`);
    for (const email of weak) console.warn(`  - ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

