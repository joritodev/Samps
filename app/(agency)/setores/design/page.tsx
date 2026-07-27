import { DemandStatus, WorkSector } from "@prisma/client";
import { db } from "@/lib/db";
import { DesignBoard } from "@/components/agency/design-board";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toBoardDemand(row: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sector: WorkSector | null;
  deadline: Date | null;
  materialUrl: string | null;
  publishedUrl: string | null;
  client: { name: string };
}): BoardDemand {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    sector: row.sector,
    deadline: row.deadline?.toISOString() ?? null,
    materialUrl: row.materialUrl,
    publishedUrl: row.publishedUrl,
    clientName: row.client.name,
  };
}

export default async function DesignSectorPage() {
  let columns: BoardColumn[] = [
    { id: "available", title: "Demandas disponíveis", cards: [] },
    { id: "production", title: "Em produção", cards: [] },
    { id: "adjustments", title: "Ajustes", cards: [] },
    { id: "review", title: "Aguardando revisão", cards: [] },
    { id: "done_today", title: "Concluídas hoje", cards: [] },
  ];

  try {
    const rows = await db.demand.findMany({
      where: { sector: WorkSector.DESIGN },
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const demands = rows.map(toBoardDemand);
    const today = startOfToday();

    columns = [
      {
        id: "available",
        title: "Demandas disponíveis",
        cards: demands.filter((d) => d.status === DemandStatus.AVAILABLE),
      },
      {
        id: "production",
        title: "Em produção",
        cards: demands.filter((d) => d.status === DemandStatus.IN_PRODUCTION),
      },
      {
        id: "adjustments",
        title: "Ajustes",
        cards: demands.filter((d) => d.status === DemandStatus.IN_ADJUSTMENT),
      },
      {
        id: "review",
        title: "Aguardando revisão",
        cards: demands.filter((d) => d.status === DemandStatus.IN_REVIEW),
      },
      {
        id: "done_today",
        title: "Concluídas hoje",
        cards: demands.filter((d) => {
          if (
            d.status !== DemandStatus.DONE &&
            d.status !== DemandStatus.APPROVED
          ) {
            return false;
          }
          const row = rows.find((r) => r.id === d.id);
          return row ? row.updatedAt >= today : false;
        }),
      },
    ];
  } catch (error) {
    console.error("design board findMany", error);
  }

  return <DesignBoard columns={columns} />;
}
