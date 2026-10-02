import { DemandStatus, UserStatus, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";
import { buildContextWhere } from "@/lib/services/demands.service";
import {
  countDelaysInMonth,
  syncDemandDelays,
} from "@/lib/services/delay.service";
import {
  FLOW_STAGES,
  OPEN_EXCLUDED,
  READY_STATUSES,
} from "@/lib/agency/demand-filters";
import { attentionLabel, rankByAttention } from "@/lib/agency/attention";

/** Cargos que produzem demanda (entram em "Carga por pessoa"). */
const PRODUCTION_TYPES: UserType[] = [
  UserType.SOCIAL_MEDIA,
  UserType.DESIGNER,
  UserType.VIDEOMAKER,
  UserType.VIDEO_EDITOR,
  UserType.OTHER,
];

export async function getManagementOverview(user: SessionUser) {
  const where = buildContextWhere(user, "management");
  const openWhere = { ...where, status: { notIn: OPEN_EXCLUDED } };
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [open, overdue, doneToday, unassigned, byStatus, bySector, byAssignee, overdueByAssignee] =
    await Promise.all([
      db.demand.count({ where: openWhere }),
      db.demand.count({ where: { ...openWhere, dueDate: { lt: now } } }),
      db.demand.count({
        where: {
          ...where,
          status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED] },
          updatedAt: { gte: today },
        },
      }),
      db.demand.count({ where: { ...openWhere, assigneeId: null } }),
      db.demand.groupBy({ by: ["status"], where: openWhere, _count: { _all: true } }),
      db.demand.groupBy({
        by: ["sectorId"],
        where: { ...openWhere, sectorId: { not: null } },
        _count: { _all: true },
      }),
      db.demand.groupBy({
        by: ["assigneeId"],
        where: { ...openWhere, assigneeId: { not: null } },
        _count: { _all: true },
      }),
      db.demand.groupBy({
        by: ["assigneeId"],
        where: { ...openWhere, assigneeId: { not: null }, dueDate: { lt: now } },
        _count: { _all: true },
      }),
    ]);

  const countOf = (statuses: readonly DemandStatus[]) =>
    byStatus
      .filter((g) => statuses.includes(g.status))
      .reduce((sum, g) => sum + g._count._all, 0);

  const flow = FLOW_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: countOf(stage.statuses),
  }));
  const adjustments = countOf([DemandStatus.ADJUSTMENTS]);

  const sectors = await db.sector.findMany({
    where: { slug: { in: ["social", "social-media", "design", "video", "trafego"] } },
    select: { id: true, name: true, slug: true, color: true },
    orderBy: { name: "asc" },
  });
  const sectorStats = sectors.map((s) => ({
    ...s,
    openCount: bySector.find((g) => g.sectorId === s.id)?._count._all ?? 0,
  }));
  const noSectorCount = Math.max(
    open - bySector.reduce((sum, g) => sum + g._count._all, 0),
    0
  );

  // Carga por pessoa: todo mundo da produção, inclusive quem está livre.
  const [team, activeSessions] = await Promise.all([
    db.user.findMany({
      where: { status: UserStatus.ACTIVE, userType: { in: PRODUCTION_TYPES } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        sector: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.workSession.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true },
    }),
  ]);
  const producing = new Set(activeSessions.map((s) => s.userId));
  const peopleLoad = team
    .map((person) => ({
      id: person.id,
      name: person.name,
      sectorName: person.sector?.name ?? "Sem setor",
      openCount: byAssignee.find((g) => g.assigneeId === person.id)?._count._all ?? 0,
      overdueCount:
        overdueByAssignee.find((g) => g.assigneeId === person.id)?._count._all ?? 0,
      producingNow: producing.has(person.id),
    }))
    .sort(
      (a, b) =>
        a.sectorName.localeCompare(b.sectorName, "pt-BR") ||
        a.openCount - b.openCount ||
        a.name.localeCompare(b.name, "pt-BR")
    );

  // "Precisa de você": o que pede ação da gestão agora.
  const candidates = await db.demand.findMany({
    where: {
      ...where,
      isChecklistItem: false,
      status: { notIn: OPEN_EXCLUDED },
      OR: [{ status: { notIn: READY_STATUSES } }, { dueDate: { lt: now } }],
    },
    include: {
      client: { select: { id: true, name: true, brandColor: true } },
      assignee: { select: { id: true, name: true } },
      priority: { select: { name: true, color: true, weight: true } },
      sector: { select: { name: true, slug: true } },
    },
    orderBy: [{ dueDate: "asc" }],
    take: 200,
  });
  const needsYou = rankByAttention(
    candidates.map((d) => ({ ...d, priorityWeight: d.priority?.weight ?? 0 })),
    now
  )
    .slice(0, 6)
    .map(({ item, reason }) => ({
      demand: item,
      reason,
      reasonLabel: attentionLabel(reason, item.dueDate, now),
    }));

  await syncDemandDelays();
  const delaysThisMonth = await countDelaysInMonth(today);

  return {
    kpis: { open, overdue, doneToday, unassigned, delaysThisMonth },
    flow,
    adjustments,
    sectorStats,
    noSectorCount,
    peopleLoad,
    needsYou,
    generatedAt: now,
  };
}
