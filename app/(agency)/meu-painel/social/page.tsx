import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { SocialBoard } from "@/components/agency/social-board";
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
  sector: string | null;
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

export default async function SocialPanelPage() {
  let columns: BoardColumn[] = [
    { id: "awaiting_publish", title: "Aguardando publicação", cards: [] },
    { id: "done_today", title: "Concluídas hoje", cards: [] },
  ];

  try {
    const rows = await db.demand.findMany({
      where: {
        status: {
          in: [DemandStatus.APPROVED, DemandStatus.PUBLISHED],
        },
      },
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const demands = rows.map(toBoardDemand);
    const today = startOfToday();

    columns = [
      {
        id: "awaiting_publish",
        title: "Aguardando publicação",
        cards: demands.filter((d) => d.status === DemandStatus.APPROVED),
      },
      {
        id: "done_today",
        title: "Concluídas hoje",
        cards: demands.filter((d) => {
          if (d.status !== DemandStatus.PUBLISHED) return false;
          const row = rows.find((r) => r.id === d.id);
          return row ? row.updatedAt >= today : false;
        }),
      },
    ];
  } catch (error) {
    console.error("social panel findMany", error);
  }

  return <SocialBoard columns={columns} />;
}
