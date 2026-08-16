import { ClientStatus } from "@prisma/client";
import { PerformanceDashboard } from "@/components/agency/performance-dashboard";
import { resolvePerformanceRange } from "@/lib/agency/performance-period";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { getIndicators } from "@/lib/services/indicators.service";
import { getPerformanceReport } from "@/lib/services/performance.service";

type PerformanceSearchParams = {
  preset?: string;
  from?: string;
  to?: string;
  sectorId?: string;
  clientId?: string;
};

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: PerformanceSearchParams;
}) {
  const user = await requirePermission("productivity.view");
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const range = resolvePerformanceRange({
    preset: searchParams.preset,
    from: searchParams.from,
    to: searchParams.to,
  });
  const scope = {
    userId: isMgmt ? undefined : user.id,
    sectorId: isMgmt ? undefined : user.sectorId ?? undefined,
  };

  const [today, week, month, report, sectors, clients] = await Promise.all([
    getIndicators({ period: "today", ...scope }),
    getIndicators({ period: "week", ...scope }),
    getIndicators({ period: "month", ...scope }),
    getPerformanceReport({
      from: range.from,
      to: range.to,
      assigneeId: isMgmt ? undefined : user.id,
      sectorId: isMgmt
        ? searchParams.sectorId
        : user.sectorId ?? undefined,
      clientId: isMgmt ? searchParams.clientId : undefined,
    }),
    isMgmt
      ? db.sector.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    isMgmt
      ? db.client.findMany({
          where: { status: ClientStatus.ACTIVE },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <PerformanceDashboard
      today={today}
      week={week}
      month={month}
      report={report}
      filters={{
        preset: range.preset,
        from: report.from,
        to: report.to,
        sectorId: isMgmt ? searchParams.sectorId : undefined,
        clientId: isMgmt ? searchParams.clientId : undefined,
        isMgmt,
        sectors,
        clients,
      }}
    />
  );
}
