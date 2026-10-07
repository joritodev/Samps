import { DemandStatus } from "@prisma/client";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

/**
 * Colunas do quadro geral, na mesma ordem do ciclo dos quadros de setor.
 * Concluídas guarda o que já foi publicado ou encerrado, não só o de hoje:
 * o quadro geral é o histórico; o do setor só segura a fila do dia.
 */
const COLUMNS: { id: string; title: string; statuses: DemandStatus[] }[] = [
  {
    id: "planning",
    title: "A planejar",
    statuses: [
      DemandStatus.PENDING_PLANNING,
      DemandStatus.PLANNING,
      DemandStatus.BACKLOG,
      DemandStatus.OPEN,
    ],
  },
  {
    id: "todo",
    title: "Demandadas / A fazer",
    statuses: [DemandStatus.AVAILABLE, DemandStatus.DEMANDED],
  },
  {
    id: "production",
    title: "Em produção",
    statuses: [DemandStatus.IN_PRODUCTION, DemandStatus.OVERDUE],
  },
  {
    id: "adjustments",
    title: "Ajustes",
    statuses: [DemandStatus.ADJUSTMENTS],
  },
  {
    id: "review",
    title: "Aguardando revisão",
    statuses: [DemandStatus.IN_REVIEW],
  },
  {
    id: "publication",
    title: "Aguardando publicação",
    statuses: [DemandStatus.APPROVED, DemandStatus.SCHEDULED],
  },
  {
    id: "done",
    title: "Concluídas",
    statuses: [
      DemandStatus.PUBLISHED,
      DemandStatus.DONE,
      DemandStatus.DELIVERED,
    ],
  },
];

export function groupIntoStatusColumns(demands: BoardDemand[]): BoardColumn[] {
  return COLUMNS.map((column) => ({
    id: column.id,
    title: column.title,
    cards: demands.filter((demand) =>
      column.statuses.includes(demand.status as DemandStatus)
    ),
  }));
}
