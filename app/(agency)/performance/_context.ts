import { ClientStatus } from "@prisma/client";
import type { PerformanceFiltersProps } from "@/components/performance/performance-filters";
import { comparisonRangeFor, resolvePerformanceRange } from "@/lib/agency/performance-period";
import { dayKey } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";

export type PerformanceSearchParams = {
  preset?: string;
  from?: string;
  to?: string;
  sectorId?: string;
  clientId?: string;
};

/** Período, recorte e opções de filtro, iguais para todas as abas. */
export async function loadPerformanceContext(searchParams: PerformanceSearchParams) {
  const user = await requirePermission("productivity.view");
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const range = resolvePerformanceRange({
    preset: searchParams.preset,
    from: searchParams.from,
    to: searchParams.to,
  });
  const scope = isMgmt
    ? { sectorId: searchParams.sectorId, clientId: searchParams.clientId }
    : { userId: user.id, sectorId: user.sectorId ?? undefined };

  const [sectors, clients] = isMgmt
    ? await Promise.all([
        db.sector.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        db.client.findMany({
          where: { status: ClientStatus.ACTIVE },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ])
    : [[], []];

  const filters: PerformanceFiltersProps = {
    preset: range.preset,
    from: dayKey(range.from),
    to: dayKey(range.to),
    sectorId: isMgmt ? searchParams.sectorId : undefined,
    clientId: isMgmt ? searchParams.clientId : undefined,
    isMgmt,
    sectors,
    clients,
  };

  return { user, isMgmt, range, previousRange: comparisonRangeFor(range), scope, filters };
}
