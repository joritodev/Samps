import { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ClientsView } from "@/components/agency/clients-view";
import type { ClientListItem } from "@/types/clients-ui";

const CLOSED: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.CANCELLED,
];

export default async function ClientesPage() {
  let clients: ClientListItem[] = [];

  try {
    const rows = await db.client.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          include: { user: { select: { id: true, name: true } } },
        },
        demands: {
          where: { status: { notIn: CLOSED } },
          select: { id: true },
        },
      },
    });

    clients = rows.map((row) => ({
      id: row.id,
      name: row.name,
      logo: row.logo,
      active: row.active,
      openDemands: row.demands.length,
      team: row.users.map((link) => ({
        id: link.user.id,
        name: link.user.name,
        role: link.linkRole,
      })),
    }));
  } catch (error) {
    console.error("clientes list", error);
  }

  return <ClientsView clients={clients} />;
}
