import { WorkSessionStage, WorkSessionStatus, type Prisma } from "@prisma/client";
import { OPEN_EXCLUDED } from "@/lib/agency/demand-filters";
import {
  buildPerformanceSummary,
  resolveComparisonRanges,
  type DateRange,
  type DeliveryRow,
  type PerformanceSummary,
} from "@/lib/agency/performance-summary";
import { db } from "@/lib/db";

/** Recorte do resumo: agência inteira (vazio), setor, cliente e/ou pessoa. */
export type SummaryScope = {
  sectorId?: string;
  clientId?: string;
  userId?: string;
};

export function demandScopeWhere(scope: SummaryScope): Prisma.DemandWhereInput {
  return {
    isChecklistItem: false,
    ...(scope.sectorId ? { sectorId: scope.sectorId } : {}),
    ...(scope.clientId ? { clientId: scope.clientId } : {}),
    ...(scope.userId ? { assigneeId: scope.userId } : {}),
  };
}

type DeliveryQueryRow = {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
  productionCompletedAt: Date | null;
  assignee: { id: string; name: string } | null;
  contentType: { id: string; name: string } | null;
  workSessions: { stage: string; totalActiveSeconds: number }[];
};

export function toDeliveryRows(rows: DeliveryQueryRow[]): DeliveryRow[] {
  return rows.flatMap((row) =>
    row.productionCompletedAt
      ? [
          {
            id: row.id,
            createdAt: row.createdAt,
            dueDate: row.dueDate,
            completedAt: row.productionCompletedAt,
            assignee: row.assignee,
            contentType: row.contentType,
            hadRework: row.workSessions.some(
              (s) => s.stage === WorkSessionStage.ADJUSTMENT
            ),
            activeSeconds: row.workSessions.reduce(
              (sum, s) => sum + s.totalActiveSeconds,
              0
            ),
          },
        ]
      : []
  );
}

async function workedSeconds(scope: SummaryScope, range: DateRange) {
  const demandWhere = demandScopeWhere({ ...scope, userId: undefined });
  const hasDemandScope = Boolean(scope.sectorId || scope.clientId);
  const agg = await db.workSession.aggregate({
    where: {
      status: WorkSessionStatus.COMPLETED,
      endedAt: { gte: range.from, lte: range.to },
      ...(scope.userId ? { userId: scope.userId } : {}),
      ...(hasDemandScope ? { demand: demandWhere } : {}),
    },
    _sum: { totalActiveSeconds: true },
  });
  return agg._sum.totalActiveSeconds ?? 0;
}

/**
 * Resumo de performance de um recorte. Compara o período com o anterior de
 * mesma duração. Atrasadas, ajustes e sem responsável são "agora" (o banco
 * não guarda histórico de status), por isso não comparam.
 */
export async function getPerformanceSummary(params: {
  scope?: SummaryScope;
  range: DateRange;
  now?: Date;
}): Promise<PerformanceSummary> {
  const scope = params.scope ?? {};
  const now = params.now ?? new Date();
  const { current, previous } = resolveComparisonRanges(params.range);
  const where = demandScopeWhere(scope);
  const open = { status: { notIn: OPEN_EXCLUDED } };

  const [deliveries, workedCurrent, workedPrevious, overdue, adjustments, unassigned, overdueGroups] =
    await Promise.all([
      db.demand.findMany({
        where: {
          ...where,
          productionCompletedAt: { gte: previous.from, lte: current.to },
        },
        select: {
          id: true,
          createdAt: true,
          dueDate: true,
          productionCompletedAt: true,
          assignee: { select: { id: true, name: true } },
          contentType: { select: { id: true, name: true } },
          workSessions: {
            where: { status: WorkSessionStatus.COMPLETED },
            select: { stage: true, totalActiveSeconds: true },
          },
        },
      }),
      workedSeconds(scope, current),
      workedSeconds(scope, previous),
      db.demand.count({ where: { ...where, ...open, dueDate: { lt: now } } }),
      db.demand.count({ where: { ...where, status: "ADJUSTMENTS" } }),
      // Sem responsável não faz sentido no recorte de uma pessoa.
      scope.userId
        ? Promise.resolve(0)
        : db.demand.count({ where: { ...where, ...open, assigneeId: null } }),
      db.demand.groupBy({
        by: ["sectorId"],
        where: { ...where, ...open, dueDate: { lt: now } },
        _count: { _all: true },
      }),
    ]);

  const sectorIds = overdueGroups.flatMap((g) => (g.sectorId ? [g.sectorId] : []));
  const sectors = sectorIds.length
    ? await db.sector.findMany({
        where: { id: { in: sectorIds } },
        select: { id: true, name: true },
      })
    : [];
  const sectorName = new Map(sectors.map((s) => [s.id, s.name]));

  return buildPerformanceSummary({
    range: params.range,
    rows: toDeliveryRows(deliveries),
    workedSeconds: { current: workedCurrent, previous: workedPrevious },
    snapshot: {
      overdue,
      adjustments,
      unassignedOpen: unassigned,
      overdueBySector: overdueGroups.map((g) => ({
        sectorId: g.sectorId,
        name: g.sectorId ? (sectorName.get(g.sectorId) ?? "Setor") : "Sem setor",
        count: g._count._all,
      })),
    },
  });
}
