"use server";

import { requireAuth } from "@/lib/permissions/check";
import { buildDemandVisibilityWhere } from "@/lib/permissions/demand-visibility";
import { listLedSectorIds } from "@/lib/permissions/led-sectors";
import { db } from "@/lib/db";
import { listSectorUsers } from "@/lib/services/sector-board.service";
import type { SectorCardDetail } from "@/components/sector/sector-card-sheet";

export type OperationalCardPayload = {
  card: SectorCardDetail;
  sectorUsers: { id: string; name: string }[];
};

/** Mesmo cartão operacional dos quadros de setor, para o quadro geral. */
export async function loadOperationalCardAction(
  demandId: string
): Promise<OperationalCardPayload | { error: string }> {
  const user = await requireAuth();
  const ledSectorIds = await listLedSectorIds(user.id);
  const visibility = buildDemandVisibilityWhere(user, { ledSectorIds });

  const demand = await db.demand.findFirst({
    where: { AND: [{ id: demandId }, visibility] },
    select: {
      id: true,
      title: true,
      description: true,
      format: true,
      status: true,
      clientId: true,
      sectorId: true,
      materialUrl: true,
      scheduledExecutionAt: true,
      demandDeadline: true,
      dueDate: true,
      publishDate: true,
      isChecklistItem: true,
      parentDemand: { select: { title: true } },
      client: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          executorId: true,
          executor: { select: { id: true, name: true } },
        },
      },
      workSessions: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        take: 1,
        select: { id: true, status: true, userId: true },
      },
    },
  });

  if (!demand) return { error: "Demanda não encontrada" };

  const sectorUsers = demand.sectorId
    ? await listSectorUsers(demand.sectorId)
    : [];

  const card: SectorCardDetail = {
    id: demand.id,
    title: demand.title,
    description: demand.description,
    format: demand.format,
    status: demand.status,
    clientId: demand.clientId,
    materialUrl: demand.materialUrl,
    scheduledExecutionAt: demand.scheduledExecutionAt,
    demandDeadline: demand.demandDeadline,
    dueDate: demand.dueDate,
    publishDate: demand.publishDate,
    isChecklistItem: demand.isChecklistItem,
    parentDemand: demand.parentDemand,
    client: demand.client,
    assignee: demand.assignee,
    assignments: demand.assignments,
    workSessions: demand.workSessions,
  };

  return { card, sectorUsers };
}
