/**
 * Monta o planejamento semanal de exemplo a partir das demandas e captações que já estão no banco
 * (por exemplo, as da simulação de um trimestre). Só mexe nas tabelas Plan*.
 *
 *   npx tsx prisma/seed-planning-demo.ts --dry-run   # mostra o que faria
 *   npx tsx prisma/seed-planning-demo.ts --yes       # monta (apaga antes os cards de exemplo antigos)
 *   npx tsx prisma/seed-planning-demo.ts --limpar    # remove só os cards de exemplo
 *
 * O que cria:
 *   - uma pessoa no quadro para cada usuário ativo de Design e Vídeo que ainda não está nele (com o
 *     sábado sem capacidade, já que a agência trabalha de segunda a sexta);
 *   - cards concluídos nesta semana, a partir das demandas entregues;
 *   - cards a fazer, a partir das demandas abertas, nas primeiras vagas livres (mesmo algoritmo do
 *     botão "Sugerir distribuição"), deixando alguns sem vaga para a demonstração;
 *   - cards de captação, a partir das captações das próximas semanas.
 * Cada card fica ligado à demanda de origem. Cards de exemplo são reconhecidos por `isDemoCard`:
 * quem arrasta ou edita um deles deixa de ser tratado como exemplo e não é apagado pelo --limpar.
 */
import { PrismaClient, UserStatus, UserType, type PlanCardStatus } from "@prisma/client";
import { isAbsentOn } from "../lib/agency/absences";
import {
  DEMO_POSITION_BASE,
  demoCategory,
  demoHours,
  demoKind,
  demoMemberColor,
  demoStatusForDemand,
  demoTitle,
  isDemoCard,
  isOpenDemandStatus,
  shootHours,
  weekdayOfKey,
} from "../lib/agency/planning/demo";
import { suggestDistribution } from "../lib/agency/planning/distribution";
import type { PlanCardData, PlanMemberData, PlanSectorSlug } from "../lib/agency/planning/types";
import { dayKeyOfWeek, isoWeekOfKey } from "../lib/agency/planning/week";
import { addDays, dayKey } from "../lib/agency/sp-calendar";

const prisma = new PrismaClient();
const SECTORS: PlanSectorSlug[] = ["design", "video"];
/** Por setor, quantas demandas abertas ficam sem vaga para mostrar o backlog. */
const LEFT_IN_BACKLOG = 3;

function hostOf(url: string | undefined) {
  return url?.match(/@([^/:?]+)/)?.[1] ?? "(desconhecido)";
}

type Row = Omit<PlanCardData, "id"> & { tempId: string; sector: PlanSectorSlug };

async function removeDemoCards() {
  const candidates = await prisma.planCard.findMany({
    where: { createdById: null, templateId: null, clientName: { not: null }, position: { gte: DEMO_POSITION_BASE } },
    select: { id: true, createdById: true, templateId: true, clientName: true, position: true },
  });
  const ids = candidates.filter(isDemoCard).map((c) => c.id);
  if (ids.length) await prisma.planCard.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const clean = process.argv.includes("--limpar");
  if (!dryRun && !clean && !process.argv.includes("--yes")) {
    throw new Error("Use --dry-run para ver o plano, --yes para montar ou --limpar para remover os cards de exemplo.");
  }

  const [tables] = await prisma.$queryRaw<{ card: string | null }[]>`SELECT to_regclass('public."PlanCard"')::text AS card`;
  if (!tables?.card) {
    throw new Error('O banco ainda não tem as tabelas do planejamento. Rode antes o workflow "Migrar banco de produção".');
  }
  console.log(`Banco: ${hostOf(process.env.DATABASE_URL)}`);

  if (clean) {
    const removed = dryRun ? 0 : await removeDemoCards();
    console.log(dryRun ? "--dry-run: nada foi alterado." : `Cards de exemplo removidos: ${removed}.`);
    return;
  }

  const sectors = await prisma.sector.findMany({ where: { slug: { in: SECTORS } }, select: { id: true, slug: true } });
  const sectorBySlug = new Map(sectors.map((s) => [s.slug as PlanSectorSlug, s.id]));
  const missing = SECTORS.filter((slug) => !sectorBySlug.has(slug));
  if (missing.length) throw new Error(`Faltam setores no sistema: ${missing.join(", ")}.`);

  const todayIso = dayKey(new Date());
  const thisWeek = isoWeekOfKey(todayIso);
  const mondayKey = dayKeyOfWeek(thisWeek, 1);

  // 1) Pessoas do quadro: usuários ativos do setor que ainda não estão nele.
  const users = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      userType: { not: UserType.EXTERNAL_CLIENT },
      sectorId: { in: Array.from(sectorBySlug.values()) },
    },
    select: { id: true, name: true, sectorId: true },
    orderBy: { name: "asc" },
  });
  const existingMembers = await prisma.planMember.findMany({ select: { userId: true } });
  const known = new Set(existingMembers.map((m) => m.userId));
  const newMembers = users.filter((u) => !known.has(u.id));
  console.log(`Pessoas do quadro a criar: ${newMembers.map((u) => u.name).join(", ") || "nenhuma (já estão)"}`);

  if (dryRun) {
    console.log("--dry-run: nada foi alterado. Os cards dependem das pessoas criadas; rode com --yes para ver o plano completo.");
    return;
  }

  const removed = await removeDemoCards();
  let order = existingMembers.length;
  for (const user of newMembers) {
    const created = await prisma.planMember.create({
      data: { userId: user.id, sectorId: user.sectorId!, color: demoMemberColor(order), sortOrder: order },
    });
    // A agência trabalha de segunda a sexta: nas pessoas criadas aqui o sábado nasce sem capacidade.
    await prisma.planCapacityOverride.create({ data: { memberId: created.id, weekday: 6, hours: 0 } });
    order++;
  }

  const memberRows = await prisma.planMember.findMany({
    where: { active: true, user: { status: UserStatus.ACTIVE } },
    include: { user: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const slugOfSector = new Map(Array.from(sectorBySlug.entries()).map(([slug, id]) => [id, slug]));
  const membersBySector = new Map<PlanSectorSlug, PlanMemberData[]>(SECTORS.map((s) => [s, []]));
  const memberByUser = new Map<string, PlanMemberData & { sector: PlanSectorSlug }>();
  for (const row of memberRows) {
    const sector = slugOfSector.get(row.sectorId);
    if (!sector) continue;
    const data = {
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      color: row.color,
      defaultCapacityHours: Number(row.defaultCapacityHours),
      sortOrder: row.sortOrder,
      active: row.active,
    };
    membersBySector.get(sector)!.push(data);
    memberByUser.set(row.userId, { ...data, sector });
  }

  // Demandas que já têm card (de gente de verdade) não ganham um segundo.
  const linked = await prisma.planCard.findMany({ where: { demandId: { not: null } }, select: { demandId: true } });
  const alreadyLinked = new Set(linked.map((l) => l.demandId));

  const weekEndKey = addDays(mondayKey, 5);
  const demands = await prisma.demand.findMany({
    where: {
      sectorId: { in: Array.from(sectorBySlug.values()) },
      isChecklistItem: false,
      OR: [
        { status: { notIn: ["DONE", "PUBLISHED", "DELIVERED", "CANCELLED"] } },
        { productionCompletedAt: { gte: new Date(`${mondayKey}T00:00:00-03:00`) } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      durationSeconds: true,
      clientId: true,
      assigneeId: true,
      sectorId: true,
      productionCompletedAt: true,
      client: { select: { name: true } },
      contentType: { select: { slug: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const done: Row[] = [];
  const open: Row[] = [];
  let counter = 0;
  for (const demand of demands) {
    if (alreadyLinked.has(demand.id) || !demand.sectorId) continue;
    const sector = slugOfSector.get(demand.sectorId);
    if (!sector) continue;
    const slug = demand.contentType?.slug ?? null;
    const member = demand.assigneeId ? memberByUser.get(demand.assigneeId) : undefined;
    const due = demand.dueDate ? dayKey(demand.dueDate) : null;
    const base = {
      tempId: `tmp-${counter++}`,
      sector,
      kind: demoKind(sector, slug),
      clientId: demand.clientId,
      clientName: demand.client.name,
      demandId: demand.id,
      templateId: null,
      title: demoTitle(demand.title),
      category: demoCategory(sector, demand.client.name, demand.title),
      durationHours: demoHours(sector, slug, demand.durationSeconds),
      pinned: false,
      required: due !== null && due <= addDays(todayIso, 1),
      recurring: false,
      dueDate: due,
      notes: null,
      position: 0,
    };

    // Produção terminada (aprovada ou agendada) ou demanda já fechada: card concluído. Em revisão
    // ou em ajuste a demanda segue aberta e o card entra como "Revisão".
    const finished = !isOpenDemandStatus(demand.status) || ["APPROVED", "SCHEDULED"].includes(demand.status);
    if (finished) {
      // Entregue: aparece concluído no dia em que a produção terminou, se foi nesta semana.
      const completed = demand.productionCompletedAt ? dayKey(demand.productionCompletedAt) : null;
      if (!completed || completed < mondayKey || completed > weekEndKey || !member) continue;
      const weekday = weekdayOfKey(completed);
      if (weekday > 6 || member.sector !== sector) continue;
      done.push({
        ...base,
        isoYear: thisWeek.year,
        isoWeek: thisWeek.week,
        weekday,
        memberId: member.id,
        status: "CONCLUIDO",
        required: false,
      });
      continue;
    }
    open.push({
      ...base,
      isoYear: thisWeek.year,
      isoWeek: thisWeek.week,
      weekday: null,
      memberId: member && member.sector === sector ? member.id : null,
      status: demoStatusForDemand(demand.status),
    });
  }

  // 2) Captações das próximas semanas viram cards de captação para quem participa.
  const shoots = await prisma.shoot.findMany({
    where: { date: { gte: new Date(`${mondayKey}T00:00:00-03:00`), lte: new Date(`${addDays(todayIso, 21)}T23:59:59-03:00`) } },
    select: {
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      clientId: true,
      client: { select: { name: true } },
      participants: { select: { userId: true } },
      ownerId: true,
    },
    orderBy: { date: "asc" },
  });
  const shootCards: Row[] = [];
  for (const shoot of shoots) {
    const key = dayKey(shoot.date);
    const weekday = weekdayOfKey(key);
    const ids = [shoot.ownerId, ...shoot.participants.map((p) => p.userId)].filter((id): id is string => Boolean(id));
    const member = ids.map((id) => memberByUser.get(id)).find((m) => m?.sector === "video");
    if (!member || weekday > 6) continue;
    const week = isoWeekOfKey(key);
    shootCards.push({
      tempId: `tmp-${counter++}`,
      sector: "video",
      isoYear: week.year,
      isoWeek: week.week,
      weekday,
      memberId: member.id,
      kind: "captacao",
      clientId: shoot.clientId,
      clientName: shoot.client.name,
      demandId: null,
      templateId: null,
      title: shoot.title.slice(0, 120),
      category: "Outro",
      durationHours: shootHours(shoot.startTime, shoot.endTime),
      status: key < todayIso ? "CONCLUIDO" : "PROGRAMADO",
      pinned: false,
      required: false,
      recurring: false,
      dueDate: null,
      notes: null,
      position: 0,
    });
  }

  // 3) Distribuição: cada setor usa o mesmo algoritmo do botão "Sugerir distribuição".
  const capacityOverrides = await prisma.planCapacityOverride.findMany({
    where: { memberId: { in: memberRows.map((m) => m.id) } },
  });
  const absences = await prisma.absence.findMany({
    where: { canceledAt: null, endsAt: { gte: new Date(`${todayIso}T00:00:00.000Z`) } },
    select: { userId: true, startsAt: true, endsAt: true, canceledAt: true },
  });
  const finalRows: Row[] = [...done, ...shootCards];
  const placed = { design: 0, video: 0 };
  const backlog = { design: 0, video: 0 };
  for (const sector of SECTORS) {
    const team = membersBySector.get(sector)!;
    if (!team.length) continue;
    const absencesByMember = new Map(
      team.map((m) => [m.id, absences.filter((a) => a.userId === m.userId)] as const),
    );
    const isAbsent = (memberId: string, key: string) =>
      (absencesByMember.get(memberId) ?? []).some((a) => isAbsentOn(a, new Date(`${key}T00:00:00.000Z`)));

    const toData = (row: Row): PlanCardData => ({ ...row, id: row.tempId });
    const rowsOfSector = open.filter((r) => r.sector === sector);
    // Prazo que já passou não impede a vaga: o card entra na primeira disponível.
    const backlogData = rowsOfSector.map((r) => ({
      ...toData(r),
      dueDate: r.dueDate && r.dueDate < todayIso ? null : r.dueDate,
    }));
    const allocatedData = finalRows.filter((r) => r.sector === sector).map(toData);

    const result = suggestDistribution({
      backlog: backlogData,
      allocatedCards: allocatedData,
      team,
      todayIso,
      overrides: capacityOverrides.map((o) => ({
        id: o.id,
        memberId: o.memberId,
        weekday: o.weekday,
        isoYear: o.isoYear,
        isoWeek: o.isoWeek,
        hours: Number(o.hours),
      })),
      blocks: [],
      isAbsent,
      horizonDays: 28,
    });
    const moveById = new Map(result.moves.map((m) => [m.card.id, m]));
    // Os últimos de cada setor ficam sem vaga, para mostrar "Demandas não alocadas".
    const keepOut = new Set(
      [...result.moves]
        .sort((a, b) => b.toDate.localeCompare(a.toDate))
        .slice(0, Math.min(LEFT_IN_BACKLOG, Math.floor(result.moves.length / 3)))
        .map((m) => m.card.id),
    );
    for (const row of rowsOfSector) {
      const move = moveById.get(row.tempId);
      if (move && !keepOut.has(row.tempId)) {
        finalRows.push({
          ...row,
          weekday: move.toWeekday,
          memberId: move.toMemberId,
          isoYear: move.toYear,
          isoWeek: move.toWeek,
        });
        placed[sector]++;
      } else {
        finalRows.push(row);
        backlog[sector]++;
      }
    }
  }

  // Posição dentro da coluna, a partir da posição de exemplo.
  const counters = new Map<string, number>();
  const data = finalRows.map((row) => {
    const column = row.weekday && row.memberId ? `${row.memberId}:${row.isoYear}:${row.isoWeek}:${row.weekday}` : "backlog";
    const position = DEMO_POSITION_BASE + (counters.get(column) ?? 0);
    counters.set(column, (counters.get(column) ?? 0) + 1);
    return {
      sectorId: sectorBySlug.get(row.sector)!,
      isoYear: row.isoYear,
      isoWeek: row.isoWeek,
      weekday: row.weekday,
      memberId: row.memberId,
      kind: row.kind,
      clientId: row.clientId,
      clientName: row.clientName,
      demandId: row.demandId,
      title: row.title,
      category: row.category,
      durationHours: row.durationHours,
      status: row.status as PlanCardStatus,
      pinned: row.pinned,
      required: row.required,
      recurring: false,
      dueDate: row.dueDate ? new Date(`${row.dueDate}T00:00:00.000Z`) : null,
      position,
    };
  });
  if (data.length) await prisma.planCard.createMany({ data });

  console.log(`Cards de exemplo antigos removidos: ${removed}`);
  console.log(
    `Cards criados: ${data.length} (concluídos nesta semana: ${done.length}, captações: ${shootCards.length}, ` +
      `a fazer com vaga: design ${placed.design} / vídeo ${placed.video}, sem vaga: design ${backlog.design} / vídeo ${backlog.video})`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
