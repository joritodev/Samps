import { AuditAction, Prisma } from "@prisma/client";
import { isAbsentOn } from "@/lib/agency/absences";
import { assertPlanning } from "@/lib/agency/planning/access";
import { statusAfterMove } from "@/lib/agency/planning/card-input";
import { suggestDistribution, type DistributionMove } from "@/lib/agency/planning/distribution";
import type { IsoWeek, PlanCardData } from "@/lib/agency/planning/types";
import { WEEKDAYS, dayKeyOfWeek, isoWeekOfKey } from "@/lib/agency/planning/week";
import { dayKey } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { getPlanningSector, listPlanMembers, toPlanCardData } from "@/lib/services/planning.service";
import type { SessionUser } from "@/types/auth";

export type DistributionMoveView = {
  cardId: string;
  title: string;
  clientName: string | null;
  fromMemberId: string | null;
  fromWeekday: number | null;
  fromYear: number;
  fromWeek: number;
  toMemberId: string;
  toWeekday: number;
  toYear: number;
  toWeek: number;
  toDate: string;
  outsideOriginalWeek: boolean;
};

export type DistributionPreview = {
  relaxed: boolean;
  variant: number;
  moves: DistributionMoveView[];
  unplaced: { id: string; title: string }[];
  /** Assinatura dos movimentos: o servidor só aplica se ela ainda bater. */
  signature: string;
};

export type DistributionParams = { variant: number; relaxed: boolean };

function assertParams(params: DistributionParams) {
  if (!Number.isInteger(params.variant) || params.variant < 0 || params.variant > 50) {
    throw new Error("Sugestão inválida.");
  }
}

function view(move: DistributionMove): DistributionMoveView {
  return {
    cardId: move.card.id,
    title: move.card.title,
    clientName: move.card.clientName,
    fromMemberId: move.fromMemberId,
    fromWeekday: move.fromWeekday,
    fromYear: move.fromYear,
    fromWeek: move.fromWeek,
    toMemberId: move.toMemberId,
    toWeekday: move.toWeekday,
    toYear: move.toYear,
    toWeek: move.toWeek,
    toDate: move.toDate,
    outsideOriginalWeek: Boolean(move.outsideOriginalWeek),
  };
}

export function distributionSignature(moves: Pick<DistributionMoveView, "cardId" | "toMemberId" | "toWeekday" | "toYear" | "toWeek">[]) {
  return moves
    .map((m) => `${m.cardId}:${m.toMemberId}:${m.toWeekday}:${m.toYear}:${m.toWeek}`)
    .join("|");
}

async function compute(user: SessionUser, slug: string, params: DistributionParams) {
  assertPlanning(user, "edit");
  assertParams(params);
  const sector = await getPlanningSector(slug);
  if (!sector) throw new Error("Setor do planejamento não encontrado.");

  const todayIso = dayKey(new Date());
  const currentWeek = isoWeekOfKey(todayIso);
  const members = await listPlanMembers(sector.id);
  const userIds = members.map((m) => m.userId);

  const [backlogRows, allocatedRows, blocks, overrides, absences] = await Promise.all([
    db.planCard.findMany({
      where: {
        sectorId: sector.id,
        status: { not: "CONCLUIDO" },
        OR: [{ weekday: null }, { memberId: null }],
      },
      orderBy: { createdAt: "asc" },
    }),
    db.planCard.findMany({
      where: {
        sectorId: sector.id,
        weekday: { not: null },
        memberId: { not: null },
        OR: [
          { isoYear: { gt: currentWeek.year } },
          { isoYear: currentWeek.year, isoWeek: { gte: currentWeek.week } },
        ],
      },
    }),
    db.planDayBlock.findMany({ where: { sectorId: sector.id } }),
    db.planCapacityOverride.findMany({ where: { memberId: { in: members.map((m) => m.id) } } }),
    userIds.length
      ? db.absence.findMany({
          where: {
            canceledAt: null,
            userId: { in: userIds },
            endsAt: { gte: new Date(`${todayIso}T00:00:00.000Z`) },
          },
          select: { userId: true, startsAt: true, endsAt: true, canceledAt: true },
        })
      : Promise.resolve([]),
  ]);

  const memberByUser = new Map(members.map((m) => [m.userId, m.id]));
  const absencesByMember = new Map<string, typeof absences>();
  for (const absence of absences) {
    const memberId = memberByUser.get(absence.userId);
    if (!memberId) continue;
    absencesByMember.set(memberId, [...(absencesByMember.get(memberId) ?? []), absence]);
  }
  const isAbsent = (memberId: string, key: string) =>
    (absencesByMember.get(memberId) ?? []).some((a) => isAbsentOn(a, new Date(`${key}T00:00:00.000Z`)));

  const result = suggestDistribution({
    backlog: backlogRows.map(toPlanCardData),
    // Só o que ainda está por vir entra na conta: dias que já passaram não se reorganizam.
    allocatedCards: allocatedRows
      .map(toPlanCardData)
      .filter((c) => dayKeyOfWeek({ year: c.isoYear, week: c.isoWeek }, c.weekday!) >= todayIso),
    team: members,
    todayIso,
    overrides: overrides.map((o) => ({
      id: o.id,
      memberId: o.memberId,
      weekday: o.weekday,
      isoYear: o.isoYear,
      isoWeek: o.isoWeek,
      hours: Number(o.hours),
    })),
    blocks: blocks.map((b) => ({
      id: b.id,
      isoYear: b.isoYear,
      isoWeek: b.isoWeek,
      weekday: b.weekday,
      memberId: b.memberId,
      reason: b.reason,
    })),
    isAbsent,
    horizonDays: 28,
    relaxed: params.relaxed,
    variant: params.variant,
  });
  return { sector, members, result, backlogCount: backlogRows.length };
}

export async function previewDistribution(
  user: SessionUser,
  slug: string,
  params: DistributionParams,
): Promise<DistributionPreview | { empty: true }> {
  const { result, backlogCount } = await compute(user, slug, params);
  if (!backlogCount) return { empty: true };
  const moves = result.moves.map(view);
  return {
    relaxed: params.relaxed,
    variant: params.variant,
    moves,
    unplaced: result.unplaced.map((c: PlanCardData) => ({ id: c.id, title: c.title })),
    signature: distributionSignature(moves),
  };
}

/** Aplica só se o cálculo de agora ainda for o que a pessoa viu na tela. */
export async function applyDistribution(
  user: SessionUser,
  slug: string,
  params: DistributionParams & { signature: string },
) {
  const { sector, members, result } = await compute(user, slug, params);
  const moves = result.moves.map(view);
  if (distributionSignature(moves) !== params.signature) {
    throw new Error("O quadro mudou desde a sugestão. Gere a sugestão de novo.");
  }
  if (result.unplaced.length > 0) {
    throw new Error("Há demandas que não couberam. Escolha outra sugestão antes de aplicar.");
  }
  if (!moves.length) return { applied: 0 };

  const cards = new Map(result.moves.map((m) => [m.card.id, m.card]));
  await db.$transaction(async (tx) => {
    for (const move of moves) {
      const card = cards.get(move.cardId)!;
      const last = await tx.planCard.aggregate({
        where: {
          sectorId: sector.id,
          isoYear: move.toYear,
          isoWeek: move.toWeek,
          weekday: move.toWeekday,
          memberId: move.toMemberId,
        },
        _max: { position: true },
      });
      await tx.planCard.update({
        where: { id: move.cardId },
        data: {
          memberId: move.toMemberId,
          weekday: move.toWeekday,
          isoYear: move.toYear,
          isoWeek: move.toWeek,
          status: statusAfterMove(card.status, true),
          position: (last._max.position ?? -1) + 1,
        },
      });
    }
  });

  const place = (memberId: string | null, weekday: number | null) =>
    memberId && weekday
      ? `${WEEKDAYS.find((d) => d.value === weekday)?.label ?? ""}/${members.find((m) => m.id === memberId)?.name ?? ""}`
      : "não alocadas";
  for (const move of moves) {
    const week: IsoWeek = { year: move.toYear, week: move.toWeek };
    await logAudit({
      userId: user.id,
      action: AuditAction.PLAN_DISTRIBUTION_APPLIED,
      entityType: "PlanCard",
      entityId: move.cardId,
      newValue: {
        sector: sector.slug,
        isoYear: week.year,
        isoWeek: week.week,
        description: `${move.title} movido de ${place(move.fromMemberId, move.fromWeekday)} para ${place(
          move.toMemberId,
          move.toWeekday,
        )} em ${move.toDate.split("-").reverse().join("/")} — distribuição automática`,
      } satisfies Prisma.InputJsonObject,
      origin: "planning",
    });
  }
  return { applied: moves.length };
}
