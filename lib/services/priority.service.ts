import { AssignmentStatus, AuditAction, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";

/** Provisional Top 5 weights — configurable later by management */
const WEIGHTS = {
  priorityWeight: 10,
  overdueBoost: 50,
  nearDeadlineDays: 3,
  nearDeadlineBoost: 20,
  unassignedBoost: 15,
  inAdjustmentBoost: 25,
  notStartedBoost: 10,
};

export async function scoreDemand(demand: {
  id: string;
  dueDate: Date | null;
  demandDeadline: Date | null;
  assigneeId: string | null;
  status: DemandStatus;
  priority: { weight: number } | null;
  assignments: { status: AssignmentStatus }[];
}) {
  const now = new Date();
  const deadline = demand.demandDeadline ?? demand.dueDate;
  let score = (demand.priority?.weight ?? 0) * WEIGHTS.priorityWeight;

  const criteria: Record<string, number> = {
    priority: (demand.priority?.weight ?? 0) * WEIGHTS.priorityWeight,
  };

  if (deadline && deadline < now && demand.status !== DemandStatus.DONE) {
    score += WEIGHTS.overdueBoost;
    criteria.overdue = WEIGHTS.overdueBoost;
  } else if (deadline) {
    const days = (deadline.getTime() - now.getTime()) / 86400000;
    if (days <= WEIGHTS.nearDeadlineDays) {
      score += WEIGHTS.nearDeadlineBoost;
      criteria.nearDeadline = WEIGHTS.nearDeadlineBoost;
    }
  }

  if (!demand.assigneeId) {
    score += WEIGHTS.unassignedBoost;
    criteria.unassigned = WEIGHTS.unassignedBoost;
  }

  const assignment = demand.assignments[0];
  if (assignment?.status === AssignmentStatus.ADJUSTMENT) {
    score += WEIGHTS.inAdjustmentBoost;
    criteria.adjustment = WEIGHTS.inAdjustmentBoost;
  }

  if (
    demand.status === DemandStatus.DEMANDED ||
    demand.status === DemandStatus.AVAILABLE ||
    demand.status === DemandStatus.PENDING_PLANNING
  ) {
    score += WEIGHTS.notStartedBoost;
    criteria.notStarted = WEIGHTS.notStartedBoost;
  }

  return { score, criteria };
}

export async function recalculateSectorPriorities(sectorId: string, userId?: string) {
  const demands = await db.demand.findMany({
    where: {
      sectorId,
      status: {
        notIn: [DemandStatus.DONE, DemandStatus.CANCELLED, DemandStatus.PUBLISHED],
      },
    },
    include: {
      priority: { select: { weight: true } },
      assignments: {
        where: {
          status: {
            in: [
              AssignmentStatus.AVAILABLE,
              AssignmentStatus.ASSIGNED,
              AssignmentStatus.IN_PROGRESS,
              AssignmentStatus.IN_REVIEW,
              AssignmentStatus.ADJUSTMENT,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const scored = await Promise.all(
    demands.map(async (d) => {
      const { score, criteria } = await scoreDemand(d);
      return { demandId: d.id, score, criteria };
    })
  );

  scored.sort((a, b) => b.score - a.score);

  for (let i = 0; i < scored.length; i++) {
    const item = scored[i];
    await db.priorityScore.upsert({
      where: {
        demandId_sectorId: { demandId: item.demandId, sectorId },
      },
      update: {
        score: item.score,
        rank: i + 1,
        calculatedAt: new Date(),
        criteria: item.criteria,
      },
      create: {
        demandId: item.demandId,
        sectorId,
        score: item.score,
        rank: i + 1,
        criteria: item.criteria,
      },
    });
  }

  if (userId) {
    await logAudit({
      userId,
      action: AuditAction.PRIORITY_RECALCULATED,
      entityType: "Sector",
      entityId: sectorId,
      newValue: { count: scored.length },
    });
  }

  return scored.slice(0, 5);
}

export async function getTop5ForSector(sectorId: string) {
  return db.priorityScore.findMany({
    where: { sectorId, rank: { lte: 5 } },
    orderBy: { rank: "asc" },
    include: {
      demand: {
        include: {
          client: { select: { id: true, name: true, brandColor: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          priority: { select: { id: true, name: true, color: true, weight: true } },
          sector: { select: { id: true, name: true, color: true, slug: true } },
        },
      },
    },
  });
}
