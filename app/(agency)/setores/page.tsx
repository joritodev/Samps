import { DemandStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { SectorsListView } from "@/components/agency/sectors-list-view";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { getDashboardPath, isSectorCollaborator } from "@/types/auth";

const OPEN_STATUSES: DemandStatus[] = [
  DemandStatus.BACKLOG,
  DemandStatus.PENDING_PLANNING,
  DemandStatus.PLANNING,
  DemandStatus.OPEN,
  DemandStatus.AVAILABLE,
  DemandStatus.DEMANDED,
  DemandStatus.IN_PRODUCTION,
  DemandStatus.IN_REVIEW,
  DemandStatus.ADJUSTMENTS,
  DemandStatus.APPROVED,
  DemandStatus.SCHEDULED,
  DemandStatus.OVERDUE,
];

export default async function SetoresPage() {
  const user = await requireAuth();
  if (isSectorCollaborator(user.userType)) {
    redirect(getDashboardPath(user.userType));
  }

  const sectors = await db.sector.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      leader: { select: { name: true } },
      _count: {
        select: {
          users: true,
          demands: { where: { status: { in: OPEN_STATUSES } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <SectorsListView
      sectors={sectors.map((sector) => ({
        id: sector.id,
        name: sector.name,
        slug: sector.slug,
        color: sector.color,
        leaderName: sector.leader?.name ?? null,
        openDemands: sector._count.demands,
        memberCount: sector._count.users,
      }))}
    />
  );
}
