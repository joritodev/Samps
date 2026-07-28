import {
  DemandDelayResolution,
  DemandStatus,
  type Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";

const TERMINAL_STATUSES: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.CANCELLED,
  DemandStatus.PUBLISHED,
];

export type DeadlineField = "dueDate" | "demandDeadline" | "publishDate";

export function getEffectiveDeadline(demand: {
  demandDeadline?: Date | null;
  dueDate?: Date | null;
}) {
  return demand.demandDeadline ?? demand.dueDate ?? null;
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isDelayEligible(demand: {
  status: DemandStatus;
  demandDeadline?: Date | null;
  dueDate?: Date | null;
}) {
  if (TERMINAL_STATUSES.includes(demand.status)) return false;
  const deadline = getEffectiveDeadline(demand);
  if (!deadline) return false;
  return deadline < new Date();
}

export async function resolveOpenDelay(
  demandId: string,
  resolution: DemandDelayResolution,
  resolvedAt: Date = new Date()
) {
  const openDelay = await db.demandDelay.findFirst({
    where: { demandId, resolvedAt: null },
  });
  if (!openDelay) return null;

  const daysOverdue = daysBetween(openDelay.originalDueDate, resolvedAt);
  return db.demandDelay.update({
    where: { id: openDelay.id },
    data: { resolvedAt, resolution, daysOverdue },
  });
}

export async function syncDemandDelays(demandIds?: string[]) {
  const now = new Date();

  const where: Prisma.DemandWhereInput = demandIds?.length
    ? { id: { in: demandIds } }
    : {
        status: { notIn: TERMINAL_STATUSES },
        OR: [{ dueDate: { not: null } }, { demandDeadline: { not: null } }],
      };

  const demands = await db.demand.findMany({
    where,
    select: {
      id: true,
      clientId: true,
      status: true,
      dueDate: true,
      demandDeadline: true,
    },
  });

  for (const demand of demands) {
    const deadline = getEffectiveDeadline(demand);
    if (!deadline) continue;

    const openDelay = await db.demandDelay.findFirst({
      where: { demandId: demand.id, resolvedAt: null },
    });

    if (isDelayEligible(demand)) {
      const daysOverdue = daysBetween(deadline, now);
      if (openDelay) {
        if (openDelay.daysOverdue !== daysOverdue) {
          await db.demandDelay.update({
            where: { id: openDelay.id },
            data: { daysOverdue },
          });
        }
      } else {
        await db.demandDelay.create({
          data: {
            demandId: demand.id,
            clientId: demand.clientId,
            originalDueDate: deadline,
            detectedAt: now,
            daysOverdue,
          },
        });
      }
    } else if (openDelay && TERMINAL_STATUSES.includes(demand.status)) {
      await resolveOpenDelay(
        demand.id,
        demand.status === DemandStatus.CANCELLED
          ? DemandDelayResolution.CANCELLED
          : DemandDelayResolution.COMPLETED,
        now
      );
    }
  }
}

export async function listDemandDelaysForDemand(demandId: string) {
  return db.demandDelay.findMany({
    where: { demandId },
    orderBy: { detectedAt: "desc" },
  });
}

export async function countDelaysInMonth(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return db.demandDelay.count({
    where: {
      detectedAt: { gte: start, lt: end },
    },
  });
}

export async function listRecentDelays(limit = 8) {
  return db.demandDelay.findMany({
    orderBy: { detectedAt: "desc" },
    take: limit,
    include: {
      demand: {
        select: {
          id: true,
          title: true,
          clientId: true,
          sectorId: true,
          client: { select: { id: true, name: true } },
          sector: { select: { slug: true } },
        },
      },
    },
  });
}

export const DELAY_RESOLUTION_LABELS: Record<DemandDelayResolution, string> = {
  COMPLETED: "Concluída em atraso",
  DEADLINE_EXTENDED: "Prazo prorrogado",
  CANCELLED: "Demanda cancelada",
};
