import { Prisma } from "@prisma/client";
import type { BoardDemand } from "@/types/board-ui";

/**
 * Select mínimo que alimenta os cartões do Kanban da agência.
 * `dueDate` é o prazo canônico interno; `demandDeadline` é o prazo do setor.
 */
export const boardDemandSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  materialUrl: true,
  publishedUrl: true,
  sector: { select: { name: true } },
  priority: { select: { name: true } },
  client: { select: { name: true } },
} satisfies Prisma.DemandSelect;

export type BoardDemandRow = Prisma.DemandGetPayload<{
  select: typeof boardDemandSelect;
}>;

export function toBoardDemand(demand: BoardDemandRow): BoardDemand {
  return {
    id: demand.id,
    title: demand.title,
    description: demand.description,
    status: demand.status,
    priority: demand.priority?.name ?? "—",
    sector: demand.sector?.name ?? null,
    dueDate: demand.dueDate?.toISOString() ?? null,
    materialUrl: demand.materialUrl,
    publishedUrl: demand.publishedUrl,
    clientName: demand.client.name,
  };
}
