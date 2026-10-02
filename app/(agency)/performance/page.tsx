import { PerformanceFilters } from "@/components/performance/performance-filters";
import { PerformanceOverview } from "@/components/performance/performance-overview";
import { getPerformanceReport } from "@/lib/services/performance.service";
import { getPerformanceSummary } from "@/lib/services/performance-summary.service";
import { loadPerformanceContext, type PerformanceSearchParams } from "./_context";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: PerformanceSearchParams;
}) {
  const { range, scope, filters } = await loadPerformanceContext(searchParams);

  const [summary, report] = await Promise.all([
    getPerformanceSummary({ scope, range }),
    getPerformanceReport({
      from: range.from,
      to: range.to,
      assigneeId: scope.userId,
      sectorId: scope.sectorId,
      clientId: scope.clientId,
    }),
  ]);

  return (
    <div className="space-y-4">
      <PerformanceFilters {...filters} />
      <PerformanceOverview summary={summary} byContentType={report.byContentType} />
    </div>
  );
}
