import { ClientStatus, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ClientsView } from "@/components/agency/clients-view";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import { listContentTypes } from "@/lib/services/settings.service";
import type { ClientListItem } from "@/types/clients-ui";

const CLOSED: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.DELIVERED,
  DemandStatus.CANCELLED,
];

export default async function ClientesPage() {
  const user = await requireAuth();
  const scope = clientScopeFilter(user);

  let clients: ClientListItem[] = [];
  const contentTypes = (await listContentTypes(false)).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  try {
    const rows = await db.client.findMany({
      where: scope ? { id: scope } : undefined,
      orderBy: { name: "asc" },
      include: {
        userLinks: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, role: { select: { name: true } } },
            },
          },
        },
        demands: {
          where: { status: { notIn: CLOSED } },
          select: { id: true },
        },
        board: { select: { id: true } },
      },
    });

    clients = rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logoUrl,
      active: row.status === ClientStatus.ACTIVE,
      openDemands: row.demands.length,
      hasBoard: Boolean(row.board),
      team: row.userLinks.map((link) => ({
        id: link.user.id,
        name: link.user.name,
        role: link.user.role.name,
      })),
    }));
  } catch (error) {
    console.error("clientes list", error);
  }

  return (
    <ClientsView
      clients={clients}
      canCreate={user.permissions.includes("clients.create")}
      contentTypes={contentTypes}
    />
  );
}
