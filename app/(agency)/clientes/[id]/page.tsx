import { notFound } from "next/navigation";
import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ClientDetailView } from "@/components/agency/client-detail-view";
import type { ClientDetail } from "@/types/clients-ui";

const CLOSED: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.CANCELLED,
];

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let client: ClientDetail | null = null;

  try {
    const row = await db.client.findUnique({
      where: { id: params.id },
      include: {
        users: {
          include: { user: { select: { id: true, name: true } } },
        },
        demands: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            sector: true,
            priority: true,
            deadline: true,
          },
        },
      },
    });

    if (row) {
      client = {
        id: row.id,
        name: row.name,
        logo: row.logo,
        active: row.active,
        contractScope: row.contractScope,
        createdAt: row.createdAt.toISOString(),
        openDemands: row.demands.filter((d) => !CLOSED.includes(d.status))
          .length,
        totalDemands: row.demands.length,
        publishedDemands: row.demands.filter(
          (d) =>
            d.status === DemandStatus.PUBLISHED ||
            d.status === DemandStatus.DONE
        ).length,
        team: row.users.map((link) => ({
          id: link.user.id,
          name: link.user.name,
          role: link.linkRole,
        })),
        demands: row.demands.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          sector: d.sector,
          priority: d.priority,
          deadline: d.deadline?.toISOString() ?? null,
        })),
      };
    }
  } catch (error) {
    console.error("cliente detail", error);
  }

  if (!client) notFound();

  return <ClientDetailView client={client} />;
}
