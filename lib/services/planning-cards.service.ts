import { AuditAction, Prisma } from "@prisma/client";
import { assertPlanning } from "@/lib/agency/planning/access";
import {
  canDragCard,
  parseMoveInput,
  parsePlanCardInput,
  statusAfterMove,
  type PlanCardInput,
  type PlanCardMoveInput,
} from "@/lib/agency/planning/card-input";
import { PLAN_SECTOR_CONFIG, isPlanSectorSlug } from "@/lib/agency/planning/config";
import { describeCardChanges } from "@/lib/agency/planning/history";
import type { IsoWeek, PlanSectorSlug } from "@/lib/agency/planning/types";
import { WEEKDAYS, formatHours, isoWeekOfKey } from "@/lib/agency/planning/week";
import { isValidDayKey } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { canAccessClient } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";
import { getPlanningSector, toPlanCardData } from "@/lib/services/planning.service";
import type { SessionUser } from "@/types/auth";

const NOT_FOUND = "Card não encontrado.";
const SECTOR_NOT_FOUND = "Setor do planejamento não encontrado.";

function assertWeek(week: IsoWeek) {
  if (
    !Number.isInteger(week.year) ||
    !Number.isInteger(week.week) ||
    week.year < 2020 ||
    week.year > 2100 ||
    week.week < 1 ||
    week.week > 53
  ) {
    throw new Error("Semana inválida.");
  }
}

async function audit(
  user: SessionUser,
  action: AuditAction,
  card: { id: string },
  sector: PlanSectorSlug,
  week: IsoWeek,
  description: string,
  previousValue?: Prisma.InputJsonValue,
) {
  await logAudit({
    userId: user.id,
    action,
    entityType: "PlanCard",
    entityId: card.id,
    previousValue,
    newValue: { sector, isoYear: week.year, isoWeek: week.week, description },
    origin: "planning",
  });
}

/** Pessoa do quadro precisa existir, estar ativa e ser do mesmo setor do card. */
async function requireMember(memberId: string, sectorId: string) {
  const member = await db.planMember.findFirst({
    where: { id: memberId, sectorId, active: true },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!member) throw new Error("Responsável inválido para este setor.");
  return { id: member.id, name: member.user.name };
}

/**
 * Cliente e demanda passam pela mesma checagem de escopo do resto do Samps:
 * quem não enxerga o cliente recebe "não encontrado" (sem revelar que existe).
 */
async function resolveLinks(
  user: SessionUser,
  value: { clientId: string | null; demandId: string | null; clientName: string | null },
) {
  let clientId = value.clientId;
  let clientName = value.clientName;

  if (value.demandId) {
    const guard = await guardDemand(user, value.demandId, {});
    if (!guard.ok) throw new Error(guard.error);
    if (clientId && clientId !== guard.demand.clientId) {
      throw new Error("A demanda escolhida não é deste cliente.");
    }
    clientId = guard.demand.clientId;
  }
  if (clientId) {
    if (!canAccessClient(user.permissions, user.clientIds, clientId)) {
      throw new Error("Cliente não encontrado.");
    }
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });
    if (!client) throw new Error("Cliente não encontrado.");
    clientName = client.name;
  }
  return { clientId, clientName, demandId: value.demandId };
}

async function nextPosition(where: Prisma.PlanCardWhereInput) {
  const last = await db.planCard.aggregate({ where, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

function dayLabel(weekday: number | null) {
  return WEEKDAYS.find((d) => d.value === weekday)?.label ?? "";
}

export async function createPlanCard(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
  input: PlanCardInput,
) {
  assertPlanning(user, "edit");
  assertWeek(week);
  const sector = await getPlanningSector(slug);
  if (!sector) throw new Error(SECTOR_NOT_FOUND);
  const parsed = parsePlanCardInput(input, sector.slug);
  if (!parsed.ok) throw new Error(parsed.error);
  const value = parsed.value;

  const member = value.memberId ? await requireMember(value.memberId, sector.id) : null;
  const links = await resolveLinks(user, value);

  const card = await db.planCard.create({
    data: {
      sectorId: sector.id,
      isoYear: week.year,
      isoWeek: week.week,
      weekday: value.weekday,
      memberId: member?.id ?? null,
      kind: value.kind,
      clientId: links.clientId,
      clientName: links.clientName,
      demandId: links.demandId,
      title: value.title,
      category: value.category,
      durationHours: value.durationHours,
      status: value.status,
      pinned: value.pinned,
      required: value.required,
      recurring: value.recurring,
      dueDate: value.dueDate ? new Date(`${value.dueDate}T00:00:00.000Z`) : null,
      notes: value.notes,
      position: await nextPosition({
        sectorId: sector.id,
        isoYear: week.year,
        isoWeek: week.week,
        weekday: value.weekday,
        memberId: member?.id ?? null,
      }),
      createdById: user.id,
    },
  });
  await audit(
    user,
    AuditAction.PLAN_CARD_CREATED,
    card,
    sector.slug,
    week,
    `Card "${value.title}" criado (${formatHours(value.durationHours)})`,
  );
  return { id: card.id };
}

async function loadCard(id: string) {
  const card = await db.planCard.findUnique({
    where: { id },
    include: { sector: { select: { id: true, slug: true } } },
  });
  if (!card || !isPlanSectorSlug(card.sector.slug)) throw new Error(NOT_FOUND);
  return { card, sector: { id: card.sector.id, slug: card.sector.slug as PlanSectorSlug } };
}

/** `week` é a semana aberta na tela: é a nova semana do card se ele sair do backlog. */
export async function updatePlanCard(
  user: SessionUser,
  id: string,
  week: IsoWeek,
  input: PlanCardInput,
) {
  assertPlanning(user, "edit");
  assertWeek(week);
  const { card, sector } = await loadCard(id);
  const parsed = parsePlanCardInput(input, sector.slug);
  if (!parsed.ok) throw new Error(parsed.error);
  const value = parsed.value;

  const member = value.memberId ? await requireMember(value.memberId, sector.id) : null;
  const links = await resolveLinks(user, value);
  const allocated = Boolean(value.weekday && member);
  const wasAllocated = Boolean(card.weekday && card.memberId);
  const targetWeek: IsoWeek =
    allocated && !wasAllocated
      ? week
      : { year: card.isoYear, week: card.isoWeek };
  const sameSlot =
    allocated &&
    wasAllocated &&
    card.weekday === value.weekday &&
    card.memberId === member!.id;

  const members = await db.planMember.findMany({
    where: { sectorId: sector.id },
    include: { user: { select: { name: true } } },
  });
  const memberRefs = members.map((m) => ({ id: m.id, name: m.user.name }));
  const before = toPlanCardData(card);
  const afterView = {
    ...before,
    title: value.title,
    clientName: links.clientName,
    kind: value.kind,
    category: value.category,
    durationHours: value.durationHours,
    status: value.status,
    memberId: member?.id ?? null,
    weekday: value.weekday,
    dueDate: value.dueDate,
    required: value.required,
    recurring: value.recurring,
    notes: value.notes,
  };

  await db.planCard.update({
    where: { id },
    data: {
      isoYear: targetWeek.year,
      isoWeek: targetWeek.week,
      weekday: afterView.weekday,
      memberId: afterView.memberId,
      kind: value.kind,
      clientId: links.clientId,
      clientName: links.clientName,
      demandId: links.demandId,
      title: value.title,
      category: value.category,
      durationHours: value.durationHours,
      status: value.status,
      pinned: value.pinned,
      required: value.required,
      recurring: value.recurring,
      dueDate: value.dueDate ? new Date(`${value.dueDate}T00:00:00.000Z`) : null,
      notes: value.notes,
      ...(sameSlot
        ? {}
        : {
            position: await nextPosition({
              sectorId: sector.id,
              isoYear: targetWeek.year,
              isoWeek: targetWeek.week,
              weekday: afterView.weekday,
              memberId: afterView.memberId,
            }),
          }),
    },
  });

  const changes = describeCardChanges(before, afterView, memberRefs, PLAN_SECTOR_CONFIG[sector.slug].kinds);
  await audit(
    user,
    AuditAction.PLAN_CARD_UPDATED,
    card,
    sector.slug,
    targetWeek,
    changes.length
      ? `Card "${value.title}" editado — ${changes.join("; ")}`
      : `Card "${value.title}" editado (sem mudanças de conteúdo)`,
  );
}

/** Arrastar e soltar: muda a coluna do card e regrava a ordem das colunas envolvidas. */
export async function movePlanCard(user: SessionUser, rawInput: PlanCardMoveInput) {
  assertPlanning(user, "edit");
  const parsed = parseMoveInput(rawInput);
  if (!parsed.ok) throw new Error(parsed.error);
  const input = parsed.value;

  const { card, sector } = await loadCard(input.cardId);
  if (!canDragCard(card)) {
    throw new Error("Card fixo semanal não pode ser arrastado. Edite o card para mudar o dia.");
  }
  const ids = [...input.orderedIds, ...input.fromOrderedIds];
  const found = await db.planCard.count({ where: { id: { in: ids }, sectorId: sector.id } });
  if (found !== ids.length) throw new Error(NOT_FOUND);

  const member = input.to ? await requireMember(input.to.memberId, sector.id) : null;
  const allocated = Boolean(input.to);

  await db.$transaction([
    ...input.orderedIds.map((id, index) =>
      db.planCard.update({
        where: { id },
        data:
          id === card.id
            ? {
                memberId: member?.id ?? null,
                weekday: input.to?.weekday ?? null,
                isoYear: input.to?.isoYear ?? card.isoYear,
                isoWeek: input.to?.isoWeek ?? card.isoWeek,
                status: statusAfterMove(card.status, allocated),
                position: index,
              }
            : { position: index },
      }),
    ),
    ...input.fromOrderedIds.map((id, index) =>
      db.planCard.update({ where: { id }, data: { position: index } }),
    ),
  ]);

  const movedColumn =
    card.memberId !== (member?.id ?? null) ||
    card.weekday !== (input.to?.weekday ?? null) ||
    card.isoWeek !== (input.to?.isoWeek ?? card.isoWeek);
  if (movedColumn) {
    const where = input.to
      ? `${dayLabel(input.to.weekday)}/${member!.name}`
      : "Não alocadas";
    await audit(
      user,
      AuditAction.PLAN_CARD_MOVED,
      card,
      sector.slug,
      input.to ? { year: input.to.isoYear, week: input.to.isoWeek } : { year: card.isoYear, week: card.isoWeek },
      `${card.title} movido para ${where}`,
    );
  }
}

/** Diálogo "Mover": data específica (mesmo em outra semana) e pessoa, ou volta ao backlog. */
export async function movePlanCardToDate(
  user: SessionUser,
  id: string,
  dateKey: string | null,
  memberId: string | null,
) {
  assertPlanning(user, "edit");
  const { card, sector } = await loadCard(id);

  if (!dateKey || !memberId) {
    await db.planCard.update({
      where: { id },
      data: {
        weekday: null,
        memberId: null,
        status: "NAO_ALOCADO",
        position: await nextPosition({ sectorId: sector.id, OR: [{ weekday: null }, { memberId: null }] }),
      },
    });
    await audit(
      user,
      AuditAction.PLAN_CARD_MOVED,
      card,
      sector.slug,
      { year: card.isoYear, week: card.isoWeek },
      `${card.title} devolvido para Não alocadas`,
    );
    return;
  }
  if (!isValidDayKey(dateKey)) throw new Error("Data inválida.");
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = new Date(y!, m! - 1, d!).getDay() || 7;
  if (weekday > 6) throw new Error("O quadro vai de segunda a sábado.");
  const week = isoWeekOfKey(dateKey);
  const member = await requireMember(memberId, sector.id);

  await db.planCard.update({
    where: { id },
    data: {
      weekday,
      memberId: member.id,
      isoYear: week.year,
      isoWeek: week.week,
      status: statusAfterMove(card.status, true),
      position: await nextPosition({
        sectorId: sector.id,
        isoYear: week.year,
        isoWeek: week.week,
        weekday,
        memberId: member.id,
      }),
    },
  });
  await audit(
    user,
    AuditAction.PLAN_CARD_MOVED,
    card,
    sector.slug,
    week,
    `${card.title} movido para ${dayLabel(weekday)}/${member.name} (${dateKey.split("-").reverse().slice(0, 2).join("/")})`,
  );
}

export async function togglePlanCardComplete(user: SessionUser, id: string) {
  assertPlanning(user, "edit");
  const { card, sector } = await loadCard(id);
  const done = card.status === "CONCLUIDO";
  const next = done ? (card.weekday && card.memberId ? "PROGRAMADO" : "NAO_ALOCADO") : "CONCLUIDO";
  await db.planCard.update({ where: { id }, data: { status: next } });
  await audit(
    user,
    AuditAction.PLAN_CARD_UPDATED,
    card,
    sector.slug,
    { year: card.isoYear, week: card.isoWeek },
    `Card "${card.title}" ${done ? "reaberto" : "concluído"}`,
  );
  return { status: next };
}

/** Cópia vai para "Demandas não alocadas" da semana aberta, sem vínculo com a demanda. */
export async function duplicatePlanCard(user: SessionUser, id: string, week: IsoWeek) {
  assertPlanning(user, "edit");
  assertWeek(week);
  const { card, sector } = await loadCard(id);
  const copy = await db.planCard.create({
    data: {
      sectorId: sector.id,
      isoYear: week.year,
      isoWeek: week.week,
      weekday: null,
      memberId: null,
      kind: card.kind,
      clientId: card.clientId,
      clientName: card.clientName,
      demandId: null,
      templateId: null,
      title: `${card.title} — cópia`,
      category: card.category,
      durationHours: card.durationHours,
      status: "NAO_ALOCADO",
      pinned: false,
      required: card.required,
      recurring: card.recurring,
      dueDate: card.dueDate,
      notes: card.notes,
      position: await nextPosition({ sectorId: sector.id, OR: [{ weekday: null }, { memberId: null }] }),
      createdById: user.id,
    },
  });
  await audit(
    user,
    AuditAction.PLAN_CARD_CREATED,
    copy,
    sector.slug,
    week,
    `Card "${card.title}" duplicado para demandas não alocadas`,
  );
  return { id: copy.id };
}

/** Só a gestão exclui. */
export async function deletePlanCard(user: SessionUser, id: string) {
  assertPlanning(user, "manage");
  const { card, sector } = await loadCard(id);
  await db.planCard.delete({ where: { id } });
  await audit(
    user,
    AuditAction.PLAN_CARD_DELETED,
    card,
    sector.slug,
    { year: card.isoYear, week: card.isoWeek },
    `Card "${card.title}" excluído (${formatHours(Number(card.durationHours))}, ${card.category})`,
    { title: card.title, category: card.category, durationHours: Number(card.durationHours) },
  );
}

const PLAN_ACTIONS: AuditAction[] = [
  AuditAction.PLAN_CARD_CREATED,
  AuditAction.PLAN_CARD_UPDATED,
  AuditAction.PLAN_CARD_MOVED,
  AuditAction.PLAN_CARD_DELETED,
  AuditAction.PLAN_WEEK_GENERATED,
  AuditAction.PLAN_WEEK_DUPLICATED,
  AuditAction.PLAN_DISTRIBUTION_APPLIED,
  AuditAction.PLAN_SETTINGS_UPDATED,
];

export type PlanningHistoryEntry = {
  id: string;
  description: string;
  actorName: string | null;
  createdAt: string;
};

/** Histórico do setor na semana aberta (mais recentes primeiro). */
export async function listPlanningHistory(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
): Promise<PlanningHistoryEntry[]> {
  assertPlanning(user, "view");
  assertWeek(week);
  if (!isPlanSectorSlug(slug)) return [];
  const rows = await db.auditLog.findMany({
    where: {
      action: { in: PLAN_ACTIONS },
      AND: [
        { newValue: { path: ["sector"], equals: slug } },
        { newValue: { path: ["isoYear"], equals: week.year } },
        { newValue: { path: ["isoWeek"], equals: week.week } },
      ],
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((row) => {
    const value = (row.newValue ?? {}) as { description?: unknown };
    return {
      id: row.id,
      description: typeof value.description === "string" ? value.description : "Alteração",
      actorName: row.user?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  });
}
