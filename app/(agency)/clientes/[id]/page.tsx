import { notFound } from "next/navigation";
import { ClientStatus, ContractStatus, DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ClientDetailView } from "@/components/agency/client-detail-view";
import { requireClientAccess } from "@/lib/permissions/check";
import { listContentTypes } from "@/lib/services/settings.service";
import type { ClientDetail } from "@/types/clients-ui";

const CLOSED: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.DELIVERED,
  DemandStatus.CANCELLED,
];

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireClientAccess(params.id);

  let client: ClientDetail | null = null;

  try {
    const row = await db.client.findUnique({
      where: { id: params.id },
      include: {
        userLinks: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, role: { select: { name: true } } },
            },
          },
        },
        contracts: {
          where: { status: ContractStatus.ACTIVE },
          orderBy: { startDate: "desc" },
          take: 1,
          include: { services: { where: { isActive: true } } },
        },
        board: { select: { id: true } },
        demands: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            sector: { select: { name: true } },
            priority: { select: { name: true } },
          },
        },
      },
    });

    if (row) {
      const contract = row.contracts[0] ?? null;

      client = {
        id: row.id,
        name: row.name,
        logoUrl: row.logoUrl,
        active: row.status === ClientStatus.ACTIVE,
        segment: row.segment,
        planName: contract?.planName ?? null,
        birthDate: row.birthDate?.toISOString() ?? null,
        addressZip: row.addressZip,
        addressStreet: row.addressStreet,
        addressNumber: row.addressNumber,
        addressComplement: row.addressComplement,
        addressDistrict: row.addressDistrict,
        addressCity: row.addressCity,
        addressState: row.addressState,
        contractDocUrl: row.contractDocUrl,
        studyDocUrl: row.studyDocUrl,
        contractServices:
          contract?.services.map((s) => ({
            id: s.id,
            name: s.name,
            quantity: s.quantity,
            periodicity: s.periodicity,
            contentTypeId: s.contentTypeId,
          })) ?? [],
        createdAt: row.createdAt.toISOString(),
        openDemands: row.demands.filter((d) => !CLOSED.includes(d.status))
          .length,
        totalDemands: row.demands.length,
        publishedDemands: row.demands.filter(
          (d) =>
            d.status === DemandStatus.PUBLISHED ||
            d.status === DemandStatus.DONE
        ).length,
        hasBoard: Boolean(row.board),
        team: row.userLinks.map((link) => ({
          id: link.user.id,
          name: link.user.name,
          role: link.user.role.name,
        })),
        demands: row.demands.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          sector: d.sector?.name ?? null,
          priority: d.priority?.name ?? "—",
          dueDate: d.dueDate?.toISOString() ?? null,
        })),
      };
    }
  } catch (error) {
    console.error("cliente detail", error);
  }

  if (!client) notFound();

  const contentTypes = (await listContentTypes(false)).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  return (
    <ClientDetailView
      client={client}
      contentTypes={contentTypes}
      canViewAsClient={user.permissions.includes("portal.view_as_client")}
      canCreateBoard={user.permissions.includes("clients.create")}
      canEditContract={user.permissions.includes("clients.edit")}
    />
  );
}
