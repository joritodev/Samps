import { ClientStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DemandBoard } from "@/components/agency/demand-board";
import { boardDemandSelect, toBoardDemand } from "@/lib/agency/board-mapper";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import { buildDemandVisibilityWhere } from "@/lib/permissions/demand-visibility";
import { listLedSectorIds } from "@/lib/permissions/led-sectors";
import { hasPermission } from "@/lib/permissions/resolve";
import { demandFilter } from "@/lib/agency/demand-filters";
import { groupIntoStatusColumns } from "@/lib/agency/demand-columns";
import { canReviewDemand } from "@/lib/agency/labels";
import type { BoardDemand } from "@/types/board-ui";

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: { filtro?: string; abrir?: string; responsavel?: string };
}) {
  const filter = demandFilter(searchParams.filtro);
  const assigneeId = searchParams.responsavel || null;
  const user = await requireAuth();
  const canCreate = hasPermission(user.permissions, "demands.create");
  const scope = clientScopeFilter(user);
  const isGestao =
    user.userType === "ADMIN" || user.userType === "MANAGEMENT";

  const [sectors, priorities, clients, ledSectorIds] = await Promise.all([
    db.sector.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.priorityLevel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    canCreate
      ? db.client.findMany({
          where: {
            status: ClientStatus.ACTIVE,
            ...(scope ? { id: scope } : {}),
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    listLedSectorIds(user.id),
  ]);

  let demands: BoardDemand[] = [];

  try {
    const visibility = buildDemandVisibilityWhere(user, { ledSectorIds });
    const where: Prisma.DemandWhereInput = {
      AND: [
        visibility,
        { isChecklistItem: false },
        ...(filter ? [filter.where] : []),
        ...(assigneeId ? [{ assigneeId }] : []),
      ],
    };

    const rows = await db.demand.findMany({
      where,
      select: boardDemandSelect,
      orderBy: { updatedAt: "desc" },
    });

    demands = rows.map(toBoardDemand);
  } catch (error) {
    console.error("demandas findMany", error);
  }

  const columns = groupIntoStatusColumns(demands);
  const assignee = assigneeId
    ? await db.user.findUnique({ where: { id: assigneeId }, select: { name: true } })
    : null;
  const filterLabel =
    [filter?.label, assignee ? `Responsável: ${assignee.name}` : null]
      .filter(Boolean)
      .join(" · ") || undefined;

  const subtitle = isGestao
    ? "Visão global da operação"
    : ledSectorIds.length > 0
      ? "Quadro do seu setor e suas demandas"
      : "Suas demandas";

  return (
    <DemandBoard
      title="Quadro Geral de Demandas"
      subtitle={subtitle}
      columns={columns}
      taxonomy={{ sectors, priorities }}
      clients={clients}
      canCreate={canCreate}
      filterLabel={filterLabel}
      openDemandId={searchParams.abrir}
      currentUserId={user.id}
      canAssign={
        hasPermission(user.permissions, "demands.assign") || ledSectorIds.length > 0
      }
      canReview={canReviewDemand(user.userType)}
      canChangeDeadline={hasPermission(user.permissions, "demands.change_deadline")}
    />
  );
}
