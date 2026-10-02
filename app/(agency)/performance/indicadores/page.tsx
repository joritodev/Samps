import { PerformanceIndicators } from "@/components/performance/performance-indicators";
import { getPerformanceReport } from "@/lib/services/performance.service";
import { loadPerformanceContext, type PerformanceSearchParams } from "../_context";

export default async function PerformanceIndicatorsPage({
  searchParams,
}: {
  searchParams: PerformanceSearchParams;
}) {
  const { range, scope, filters } = await loadPerformanceContext(searchParams);
  const report = await getPerformanceReport({
    from: range.from,
    to: range.to,
    assigneeId: scope.userId,
    sectorId: scope.sectorId,
    clientId: scope.clientId,
  });
  return <PerformanceIndicators report={report} filters={filters} />;
}
