import { ClientStatus, DemandStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DemandBoard } from "@/components/agency/demand-board";
import { boardDemandSelect, toBoardDemand } from "@/lib/agency/board-mapper";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
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
  const seesEveryone = user.permissions.includes("clients.view_all");
  const canCreate = hasPermission(user.permissions, "demands.create");
  const scope = clientScopeFilter(user);

  const [sectors, priorities, clients] = await Promise.all([
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
  ]);

  let demands: BoardDemand[] = [];

  try {
    const where: Prisma.DemandWhereInput = seesEveryone
      ? {}
      : // Quem não enxerga a operação inteira vê o que executa mais o que
        // pertence às contas em que está alocado.
        {
          OR: [
            { assigneeId: user.id },
            { requesterId: user.id },
            ...(scope ? [{ clientId: scope }] : []),
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

  return (
    <DemandBoard
      title="Quadro Geral de Demandas"
      subtitle={
        seesEveryone ? "Visão global da operação" : "Minhas tarefas e contas"
      }
      columns={columns}
      taxonomy={{ sectors, priorities }}
      clients={clients}
      canCreate={canCreate}
    />
  );
}
