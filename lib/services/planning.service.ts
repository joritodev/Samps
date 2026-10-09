import { ClientStatus, DemandStatus, UserStatus } from "@prisma/client";
import { assertPlanning, type PlanningAccess } from "@/lib/agency/planning/access";
import { isAbsentOn } from "@/lib/agency/absences";
import { isPlanSectorSlug } from "@/lib/agency/planning/config";
import type {
  IsoWeek,
  PlanCapacityOverrideData,
  PlanCardData,
  PlanCardStatus,
  PlanDayBlockData,
  PlanMemberData,
  PlanPresetData,
  PlanSectorSlug,
} from "@/lib/agency/planning/types";
import { WEEKDAYS, dayDate, dayKeyOfWeek } from "@/lib/agency/planning/week";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

export type PlanningBoardData = {
  sector: { id: string; slug: PlanSectorSlug; name: string };
  week: IsoWeek;
  members: PlanMemberData[];
  /** Cards alocados na semana + backlog global do setor (sem dia ou sem pessoa). */
  cards: PlanCardData[];
  blocks: PlanDayBlockData[];
  overrides: PlanCapacityOverrideData[];
  presets: PlanPresetData[];
  /** memberId → dias `AAAA-MM-DD` da semana em que a pessoa está ausente. */
  absentDays: Record<string, string[]>;
  /** Clientes ativos que a pessoa enxerga (escopo do Samps). */
  clients: { id: string; name: string }[];
  access: PlanningAccess;
};

type CardRow = {
  id: string;
  isoYear: number;
  isoWeek: number;
  weekday: number | null;
  memberId: string | null;
  kind: string;
  clientId: string | null;
  clientName: string | null;
  demandId: string | null;
  templateId: string | null;
  title: string;
  category: string;
  durationHours: { toString(): string };
  status: PlanCardStatus;
  pinned: boolean;
  required: boolean;
  recurring: boolean;
  dueDate: Date | null;
  notes: string | null;
  position: number;
};

export function toPlanCardData(row: CardRow): PlanCardData {
  return {
    id: row.id,
    isoYear: row.isoYear,
    isoWeek: row.isoWeek,
    weekday: row.weekday,
    memberId: row.memberId,
    kind: row.kind,
    clientId: row.clientId,
    clientName: row.clientName,
    demandId: row.demandId,
    templateId: row.templateId,
    title: row.title,
    category: row.category,
    durationHours: Number(row.durationHours),
    status: row.status,
    pinned: row.pinned,
    required: row.required,
    recurring: row.recurring,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    notes: row.notes,
    position: row.position,
  };
}

/** Setor do quadro a partir do slug da rota. O slug nunca vem de input livre da tela. */
export async function getPlanningSector(slug: string) {
  if (!isPlanSectorSlug(slug)) return null;
  const sector = await db.sector.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  return sector ? { id: sector.id, slug: slug as PlanSectorSlug, name: sector.name } : null;
}

/** Pessoas do quadro: usuários ativos com configuração de quadro neste setor. */
export async function listPlanMembers(sectorId: string): Promise<PlanMemberData[]> {
  const rows = await db.planMember.findMany({
    where: { sectorId, active: true, user: { status: UserStatus.ACTIVE } },
    include: { user: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    color: m.color,
    defaultCapacityHours: Number(m.defaultCapacityHours),
    sortOrder: m.sortOrder,
    active: m.active,
  }));
}

export async function getPlanningBoard(
  user: SessionUser,
  slug: string,
  week: IsoWeek,
): Promise<PlanningBoardData | null> {
  const access = assertPlanning(user, "view");
  const sector = await getPlanningSector(slug);
  if (!sector) return null;

  const members = await listPlanMembers(sector.id);
  const memberIds = members.map((m) => m.id);
  const firstDay = dayDate(week, 1);
  const lastDay = dayDate(week, WEEKDAYS.length);
  const rangeEnd = new Date(lastDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [weekCards, backlog, blocks, overrides, presets, absences, clients] = await Promise.all([
    db.planCard.findMany({
      where: {
        sectorId: sector.id,
        isoYear: week.year,
        isoWeek: week.week,
        weekday: { not: null },
        memberId: { not: null },
      },
      orderBy: { position: "asc" },
    }),
    db.planCard.findMany({
      where: { sectorId: sector.id, OR: [{ weekday: null }, { memberId: null }] },
      orderBy: { createdAt: "asc" },
    }),
    db.planDayBlock.findMany({
      where: { sectorId: sector.id, isoYear: week.year, isoWeek: week.week },
    }),
    db.planCapacityOverride.findMany({ where: { memberId: { in: memberIds } } }),
    db.planPreset.findMany({
      where: { sectorId: sector.id },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    members.length
      ? db.absence.findMany({
          where: {
            canceledAt: null,
            userId: { in: members.map((m) => m.userId) },
            startsAt: { lte: rangeEnd },
            endsAt: { gte: firstDay },
          },
          select: { userId: true, startsAt: true, endsAt: true, canceledAt: true },
        })
      : Promise.resolve([]),
    db.client.findMany({
      where: {
        status: ClientStatus.ACTIVE,
        ...(hasPermission(user.permissions, "clients.view_all")
          ? {}
          : { id: { in: user.clientIds } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const unique = new Map<string, CardRow>();
  for (const row of [...weekCards, ...backlog]) unique.set(row.id, row);

  const absentDays: Record<string, string[]> = {};
  for (const member of members) {
    const mine = absences.filter((a) => a.userId === member.userId);
    if (!mine.length) continue;
    const days = WEEKDAYS.filter((d) =>
      mine.some((a) => isAbsentOn(a, dayDate(week, d.value))),
    ).map((d) => dayKeyOfWeek(week, d.value));
    if (days.length) absentDays[member.id] = days;
  }

  return {
    sector,
    week,
    members,
    cards: Array.from(unique.values()).map(toPlanCardData),
    blocks: blocks.map((b) => ({
      id: b.id,
      isoYear: b.isoYear,
      isoWeek: b.isoWeek,
      weekday: b.weekday,
      memberId: b.memberId,
      reason: b.reason,
    })),
    overrides: overrides.map((o) => ({
      id: o.id,
      memberId: o.memberId,
      weekday: o.weekday,
      isoYear: o.isoYear,
      isoWeek: o.isoWeek,
      hours: Number(o.hours),
    })),
    presets: presets.map((p) => ({
      id: p.id,
      label: p.label,
      hours: Number(p.hours),
      sortOrder: p.sortOrder,
    })),
    absentDays,
    clients,
    access,
  };
}

export type LinkableDemand = {
  id: string;
  title: string;
  status: DemandStatus;
  dueDate: string | null;
};

const CLOSED_DEMAND_STATUSES: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.DELIVERED,
  DemandStatus.CANCELLED,
];

/** Demandas abertas do cliente para vincular a um card (mesmo escopo de cliente do resto do Samps). */
export async function listLinkableDemands(
  user: SessionUser,
  clientId: string,
): Promise<LinkableDemand[]> {
  assertPlanning(user, "edit");
  if (typeof clientId !== "string" || !clientId) return [];
  if (!canAccessClient(user.permissions, user.clientIds, clientId)) return [];
  const rows = await db.demand.findMany({
    where: { clientId, status: { notIn: CLOSED_DEMAND_STATUSES }, isChecklistItem: false },
    select: { id: true, title: true, status: true, dueDate: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 60,
  });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    dueDate: d.dueDate ? d.dueDate.toISOString().slice(0, 10) : null,
  }));
}

