import { ClientStatus, DemandStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DemandBoard } from "@/components/agency/demand-board";
import { boardDemandSelect, toBoardDemand } from "@/lib/agency/board-mapper";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import { buildDemandVisibilityWhere } from "@/lib/permissions/demand-visibility";
import { listLedSectorIds } from "@/lib/permissions/led-sectors";
import { hasPermission } from "@/lib/permissions/resolve";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

/** Colunas do Kanban global — por status operacional, não por entregável. */
function groupIntoStatusColumns(demands: BoardDemand[]): BoardColumn[] {
  return [
    {
      id: "planning",
      title: "A planejar",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.PENDING_PLANNING ||
          d.status === DemandStatus.PLANNING ||
          d.status === DemandStatus.BACKLOG ||
          d.status === DemandStatus.OPEN
      ),
    },
    {
      id: "todo",
      title: "Demandadas / A fazer",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.AVAILABLE ||
          d.status === DemandStatus.DEMANDED
      ),
    },
    {
      id: "production",
      title: "Em Produção",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.IN_PRODUCTION ||
          d.status === DemandStatus.ADJUSTMENTS
      ),
    },
    {
      id: "review",
      title: "Aguardando Revisão",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.IN_REVIEW ||
          d.status === DemandStatus.APPROVED
      ),
    },
    {
      id: "done",
      title: "Concluídas",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.DONE ||
          d.status === DemandStatus.PUBLISHED ||
          d.status === DemandStatus.DELIVERED
      ),
    },
  ];
}

export default async function DemandasPage() {
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
    const where: Prisma.DemandWhereInput = { ...visibility };

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
    />
  );
}
