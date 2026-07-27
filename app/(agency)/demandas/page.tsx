import { DemandStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DemandBoard } from "@/components/agency/demand-board";
import { boardDemandSelect, toBoardDemand } from "@/lib/agency/board-mapper";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

/** Colunas do Kanban global — por status operacional, não por entregável. */
function groupIntoStatusColumns(demands: BoardDemand[]): BoardColumn[] {
  return [
    {
      id: "todo",
      title: "Disponíveis / A Fazer",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.OPEN ||
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

  const [sectors, priorities] = await Promise.all([
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
  ]);

  let demands: BoardDemand[] = [];

  try {
    const scope = clientScopeFilter(user);
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
    />
  );
}
