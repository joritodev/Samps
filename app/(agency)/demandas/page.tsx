import { DemandStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DemandBoard } from "@/components/agency/demand-board";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

type MockRole = "ADMIN" | "MANAGER" | "DESIGNER" | "SOCIAL_MEDIA" | "MEMBER";

function toBoardDemand(demand: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sector: string | null;
  deadline: Date | null;
  materialUrl: string | null;
  publishedUrl: string | null;
  client: { name: string };
}): BoardDemand {
  return {
    id: demand.id,
    title: demand.title,
    description: demand.description,
    status: demand.status,
    priority: demand.priority,
    sector: demand.sector,
    deadline: demand.deadline?.toISOString() ?? null,
    materialUrl: demand.materialUrl,
    publishedUrl: demand.publishedUrl,
    clientName: demand.client.name,
  };
}

/** Colunas do Kanban global — por status operacional, não por entregável. */
function groupIntoStatusColumns(demands: BoardDemand[]): BoardColumn[] {
  return [
    {
      id: "todo",
      title: "Disponíveis / A Fazer",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.OPEN || d.status === DemandStatus.AVAILABLE
      ),
    },
    {
      id: "production",
      title: "Em Produção",
      cards: demands.filter(
        (d) =>
          d.status === DemandStatus.IN_PRODUCTION ||
          d.status === DemandStatus.IN_ADJUSTMENT
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
          d.status === DemandStatus.DONE || d.status === DemandStatus.PUBLISHED
      ),
    },
  ];
}

export default async function DemandasPage() {
  // Mock do usuário logado — NextAuth na próxima etapa.
  // Troque role para 'DESIGNER' / 'SOCIAL_MEDIA' e use um UUID real do seed para testar RBAC.
  const currentUser = { id: "ID_DO_USUARIO_AQUI", role: "ADMIN" as MockRole };

  const isManagement =
    currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  let demands: BoardDemand[] = [];

  try {
    let where: Prisma.DemandWhereInput | undefined;

    if (isManagement) {
      where = undefined;
    } else {
      // Resolve UUID real do seed quando o placeholder ainda estiver ativo
      let assigneeId = currentUser.id;
      if (assigneeId === "ID_DO_USUARIO_AQUI") {
        const seeded = await db.user.findFirst({
          where: {
            role:
              currentUser.role === "MEMBER"
                ? "DESIGNER"
                : (currentUser.role as "DESIGNER" | "SOCIAL_MEDIA"),
          },
          select: { id: true },
        });
        assigneeId = seeded?.id ?? currentUser.id;
      }
      where = { assigneeId };
    }

    const rows = await db.demand.findMany({
      where,
      include: { client: { select: { name: true } } },
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
        isManagement
          ? "Visão global da operação"
          : "Minhas tarefas atribuídas"
      }
      columns={columns}
    />
  );
}
