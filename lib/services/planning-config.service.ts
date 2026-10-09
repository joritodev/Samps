import { AuditAction, Prisma, UserStatus, UserType } from "@prisma/client";
import { assertPlanning } from "@/lib/agency/planning/access";
import {
  blockReason,
  parseCapacityOverride,
  parseMemberSettings,
  parsePresetInput,
  parseTemplateList,
  type CapacityOverrideInput,
  type MemberSettingsInput,
  type PresetInput,
  type TemplateInput,
} from "@/lib/agency/planning/config-input";
import { planDuplicateWeek, planWeekFromTemplates } from "@/lib/agency/planning/generate";
import type { IsoWeek, PlanSectorSlug, PlanTemplateData } from "@/lib/agency/planning/types";
import { WEEKDAYS, formatHours, shiftWeek } from "@/lib/agency/planning/week";
import { db } from "@/lib/db";
import { canAccessClient } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";
import { getPlanningSector, toPlanCardData } from "@/lib/services/planning.service";
import type { SessionUser } from "@/types/auth";

const SECTOR_NOT_FOUND = "Setor do planejamento não encontrado.";

async function manageContext(user: SessionUser, slug: string) {
  assertPlanning(user, "manage");
  const sector = await getPlanningSector(slug);
  if (!sector) throw new Error(SECTOR_NOT_FOUND);
  return sector;
}

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

async function auditSettings(
  user: SessionUser,
  action: AuditAction,
  sector: { id: string; slug: PlanSectorSlug },
  week: IsoWeek,
  description: string,
) {
  await logAudit({
    userId: user.id,
    action,
    entityType: "PlanSetting",
    entityId: sector.id,
    newValue: { sector: sector.slug, isoYear: week.year, isoWeek: week.week, description },
    origin: "planning",
  });
}

/* -------------------------------- Equipe -------------------------------- */

/** Usuários internos ativos do setor que ainda não estão no quadro. */
export async function listEligibleMembers(user: SessionUser, slug: string) {
  const sector = await manageContext(user, slug);
  const rows = await db.user.findMany({
    where: {
      sectorId: sector.id,
      status: UserStatus.ACTIVE,
      userType: { not: UserType.EXTERNAL_CLIENT },
      OR: [{ planMember: null }, { planMember: { active: false } }],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function addPlanMember(user: SessionUser, slug: string, userId: string, week: IsoWeek) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const person = await db.user.findFirst({
    where: {
      id: userId,
      sectorId: sector.id,
      status: UserStatus.ACTIVE,
      userType: { not: UserType.EXTERNAL_CLIENT },
    },
    select: { id: true, name: true },
  });
  if (!person) throw new Error("Esta pessoa não pertence ao setor.");
  const last = await db.planMember.aggregate({ where: { sectorId: sector.id }, _max: { sortOrder: true } });
  await db.planMember.upsert({
    where: { userId: person.id },
    create: {
      userId: person.id,
      sectorId: sector.id,
      color: "#7c3aed",
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
    update: { active: true, sectorId: sector.id },
  });
  await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, `Profissional "${person.name}" adicionado`);
}

export async function saveMemberSettings(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
  inputs: MemberSettingsInput[],
) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  if (!Array.isArray(inputs) || inputs.length > 100) throw new Error("Dados inválidos.");
  const parsed = inputs.map((input) => {
    const result = parseMemberSettings(input);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  });
  const owned = await db.planMember.count({
    where: { id: { in: parsed.map((p) => p.id) }, sectorId: sector.id },
  });
  if (owned !== parsed.length) throw new Error("Profissional inválido.");
  await db.$transaction(
    parsed.map((p) =>
      db.planMember.update({
        where: { id: p.id },
        data: { color: p.color, defaultCapacityHours: p.defaultCapacityHours },
      }),
    ),
  );
  await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, "Configurações da equipe atualizadas");
}

export async function deactivatePlanMember(user: SessionUser, slug: string, id: string, week: IsoWeek) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const member = await db.planMember.findFirst({
    where: { id, sectorId: sector.id },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!member) throw new Error("Profissional inválido.");
  await db.planMember.update({ where: { id }, data: { active: false } });
  await auditSettings(
    user,
    AuditAction.PLAN_SETTINGS_UPDATED,
    sector,
    week,
    `Profissional "${member.user.name}" desativado`,
  );
}

export async function setCapacityOverride(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
  input: CapacityOverrideInput,
) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const parsed = parseCapacityOverride(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const value = parsed.value;
  const member = await db.planMember.findFirst({
    where: { id: value.memberId, sectorId: sector.id },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!member) throw new Error("Profissional inválido.");

  const where = {
    memberId: member.id,
    weekday: value.weekday,
    isoYear: value.week?.year ?? null,
    isoWeek: value.week?.week ?? null,
  };
  // Sem unique no banco (colunas nulas): troca a linha em transação.
  await db.$transaction([
    db.planCapacityOverride.deleteMany({ where }),
    db.planCapacityOverride.create({ data: { ...where, hours: value.hours } }),
  ]);
  const day = WEEKDAYS.find((d) => d.value === value.weekday)?.label ?? "";
  await auditSettings(
    user,
    AuditAction.PLAN_SETTINGS_UPDATED,
    sector,
    week,
    `Capacidade de ${member.user.name} em ${day} ${value.week ? "(só nesta semana) " : ""}definida em ${formatHours(value.hours)}`,
  );
}

/* ------------------------------- Bloqueios ------------------------------- */

export async function toggleDayBlock(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
  weekday: number,
  memberId: string | null,
) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 6) throw new Error("Dia inválido.");
  let who = "dia inteiro";
  if (memberId) {
    const member = await db.planMember.findFirst({
      where: { id: memberId, sectorId: sector.id },
      select: { user: { select: { name: true } } },
    });
    if (!member) throw new Error("Profissional inválido.");
    who = member.user.name;
  }
  const existing = await db.planDayBlock.findFirst({
    where: { sectorId: sector.id, isoYear: week.year, isoWeek: week.week, weekday, memberId },
    select: { id: true },
  });
  const day = WEEKDAYS.find((d) => d.value === weekday)?.label ?? "";
  if (existing) {
    await db.planDayBlock.delete({ where: { id: existing.id } });
    await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, `Bloqueio removido — ${day} (${who})`);
    return { blocked: false as const };
  }
  await db.planDayBlock.create({
    data: {
      sectorId: sector.id,
      isoYear: week.year,
      isoWeek: week.week,
      weekday,
      memberId,
      reason: blockReason(memberId),
    },
  });
  await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, `Bloqueio criado — ${day} (${who})`);
  return { blocked: true as const };
}

/* --------------------------- Tipos de produção --------------------------- */

export async function createPreset(user: SessionUser, slug: string, week: IsoWeek, input: PresetInput) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const parsed = parsePresetInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const last = await db.planPreset.aggregate({ where: { sectorId: sector.id }, _max: { sortOrder: true } });
  try {
    await db.planPreset.create({
      data: {
        sectorId: sector.id,
        label: parsed.value.label,
        hours: parsed.value.hours,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Já existe um tipo de produção com este nome.");
    }
    throw error;
  }
  await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, `Tipo de produção "${parsed.value.label}" criado`);
}

export async function deletePreset(user: SessionUser, slug: string, week: IsoWeek, id: string) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const preset = await db.planPreset.findFirst({ where: { id, sectorId: sector.id }, select: { label: true } });
  if (!preset) throw new Error("Tipo de produção não encontrado.");
  await db.planPreset.delete({ where: { id } });
  await auditSettings(user, AuditAction.PLAN_SETTINGS_UPDATED, sector, week, `Tipo de produção "${preset.label}" removido`);
}

/* --------------------------- Demandas fixas ----------------------------- */

export async function listPlanTemplates(user: SessionUser, slug: string): Promise<PlanTemplateData[]> {
  const sector = await manageContext(user, slug);
  const rows = await db.planTemplate.findMany({
    where: { sectorId: sector.id },
    include: { client: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((t) => ({
    id: t.id,
    clientId: t.clientId,
    clientName: t.client?.name ?? null,
    title: t.title,
    kind: t.kind,
    category: t.category,
    durationHours: Number(t.durationHours),
    weeklyQuantity: t.weeklyQuantity,
    preferredMemberId: t.preferredMemberId,
    preferredWeekday: t.preferredWeekday,
    required: t.required,
    active: t.active,
    sortOrder: t.sortOrder,
  }));
}

/** Substitui o conjunto de demandas fixas do cliente neste setor. */
export async function saveClientTemplates(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
  clientId: string,
  inputs: TemplateInput[],
) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  if (!canAccessClient(user.permissions, user.clientIds, clientId)) {
    throw new Error("Cliente não encontrado.");
  }
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } });
  if (!client) throw new Error("Cliente não encontrado.");
  const parsed = parseTemplateList(inputs, sector.slug);
  if (!parsed.ok) throw new Error(parsed.error);
  const values = parsed.value;

  const memberIds = Array.from(new Set(values.map((v) => v.preferredMemberId).filter((id): id is string => Boolean(id))));
  if (memberIds.length) {
    const found = await db.planMember.count({ where: { id: { in: memberIds }, sectorId: sector.id } });
    if (found !== memberIds.length) throw new Error("Responsável inválido para este setor.");
  }

  await db.$transaction(async (tx) => {
    const existing = await tx.planTemplate.findMany({
      where: { sectorId: sector.id, clientId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const keep = new Set<string>();
    for (const value of values) {
      if (value.id && !existingIds.has(value.id)) throw new Error("Demanda fixa não encontrada.");
      if (value.id) keep.add(value.id);
    }
    await tx.planTemplate.deleteMany({
      where: { sectorId: sector.id, clientId, id: { notIn: Array.from(keep) } },
    });
    for (let index = 0; index < values.length; index++) {
      const value = values[index]!;
      const data = {
        title: value.title,
        kind: value.kind,
        category: value.category,
        durationHours: value.durationHours,
        weeklyQuantity: value.weeklyQuantity,
        preferredMemberId: value.preferredMemberId,
        preferredWeekday: value.preferredWeekday,
        required: value.required,
        sortOrder: index,
      };
      if (value.id) await tx.planTemplate.update({ where: { id: value.id }, data });
      else await tx.planTemplate.create({ data: { ...data, sectorId: sector.id, clientId } });
    }
  });
  await auditSettings(
    user,
    AuditAction.PLAN_SETTINGS_UPDATED,
    sector,
    week,
    `Demandas fixas de "${client.name}" atualizadas (${values.length})`,
  );
}

/* ------------------------ Gerar e duplicar a semana ----------------------- */

type Tx = Prisma.TransactionClient;

async function lockWeek(tx: Tx, sectorId: string, week: IsoWeek) {
  // Duas telas abrindo a mesma semana não podem gerar os cards duas vezes.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`plan:${sectorId}:${week.year}:${week.week}`}))`;
}

function toRows(
  rows: ReturnType<typeof planWeekFromTemplates>,
  sectorId: string,
): Prisma.PlanCardCreateManyInput[] {
  return rows.map((r) => ({
    sectorId,
    isoYear: r.isoYear,
    isoWeek: r.isoWeek,
    weekday: r.weekday,
    memberId: r.memberId,
    kind: r.kind,
    clientId: r.clientId,
    clientName: r.clientName,
    templateId: r.templateId,
    title: r.title,
    category: r.category,
    durationHours: r.durationHours,
    status: r.status,
    pinned: r.pinned,
    required: r.required,
    recurring: r.recurring,
    notes: r.notes,
    position: r.position,
  }));
}

async function loadWeekCards(tx: Tx, sectorId: string, week: IsoWeek) {
  const rows = await tx.planCard.findMany({
    where: { sectorId, isoYear: week.year, isoWeek: week.week },
  });
  return rows.map(toPlanCardData);
}

async function generateInTx(tx: Tx, sectorId: string, week: IsoWeek) {
  const templates = await tx.planTemplate.findMany({
    where: { sectorId, active: true },
    include: { client: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const existing = await loadWeekCards(tx, sectorId, week);
  const rows = planWeekFromTemplates(
    week,
    templates.map((t) => ({
      id: t.id,
      clientId: t.clientId,
      clientName: t.client?.name ?? null,
      title: t.title,
      kind: t.kind,
      category: t.category,
      durationHours: Number(t.durationHours),
      weeklyQuantity: t.weeklyQuantity,
      preferredMemberId: t.preferredMemberId,
      preferredWeekday: t.preferredWeekday,
      required: t.required,
      active: t.active,
      sortOrder: t.sortOrder,
    })),
    existing,
  );
  if (rows.length) await tx.planCard.createMany({ data: toRows(rows, sectorId) });
  return rows.length;
}

async function duplicateInTx(tx: Tx, sectorId: string, week: IsoWeek) {
  const previous = shiftWeek(week, -1);
  const previousCards = (
    await tx.planCard.findMany({
      where: { sectorId, isoYear: previous.year, isoWeek: previous.week, recurring: true },
    })
  ).map(toPlanCardData);
  const existing = await loadWeekCards(tx, sectorId, week);
  const rows = planDuplicateWeek(week, previousCards, existing);
  if (rows.length) await tx.planCard.createMany({ data: toRows(rows, sectorId) });
  return rows.length;
}

/**
 * Ao abrir uma semana (a partir da atual), completa os cards das demandas fixas e dos fixos
 * semanais da semana anterior. Idempotente: abrir de novo não repete nada.
 */
export async function syncPlanWeek(user: SessionUser, slug: string, week: IsoWeek) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const result = await db.$transaction(async (tx) => {
    await lockWeek(tx, sector.id, week);
    const generated = await generateInTx(tx, sector.id, week);
    const duplicated = await duplicateInTx(tx, sector.id, week);
    return { generated, duplicated };
  });
  if (result.generated) {
    await auditSettings(user, AuditAction.PLAN_WEEK_GENERATED, sector, week, `Semana gerada pelas demandas fixas (${result.generated} card(s))`);
  }
  if (result.duplicated) {
    await auditSettings(user, AuditAction.PLAN_WEEK_DUPLICATED, sector, week, `Fixos da semana anterior copiados (${result.duplicated} card(s))`);
  }
  return result;
}

/** Botão "Duplicar semana anterior" (vale para qualquer semana). */
export async function duplicatePreviousWeek(user: SessionUser, slug: string, week: IsoWeek) {
  const sector = await manageContext(user, slug);
  assertWeek(week);
  const created = await db.$transaction(async (tx) => {
    await lockWeek(tx, sector.id, week);
    return duplicateInTx(tx, sector.id, week);
  });
  if (created) {
    await auditSettings(user, AuditAction.PLAN_WEEK_DUPLICATED, sector, week, `Semana anterior duplicada (${created} card(s))`);
  }
  return { created };
}
