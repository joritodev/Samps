import { PerformanceFilters } from "@/components/performance/performance-filters";
import { PerformanceOverview } from "@/components/performance/performance-overview";
import { agencyObjectives, goalsForScope } from "./_goals";
import { getPerformanceReport } from "@/lib/services/performance.service";
import { getPerformanceSummary, getQuarterHistory } from "@/lib/services/performance-summary.service";
import { loadPerformanceContext, type PerformanceSearchParams } from "./_context";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: PerformanceSearchParams;
}) {
  const { user, range, previousRange, scope, filters } = await loadPerformanceContext(searchParams);

  const [summary, report, goals, objectives, quarters] = await Promise.all([
    getPerformanceSummary({ scope, range, previousRange }),
    getPerformanceReport({
      from: range.from,
      to: range.to,
      assigneeId: scope.userId,
      sectorId: scope.sectorId,
      clientId: scope.clientId,
    }),
    goalsForScope(user, scope),
    agencyObjectives(user, scope),
    getQuarterHistory(scope),
  ]);

  return (
    <div className="space-y-4">
      <PerformanceFilters {...filters} />
      <PerformanceOverview summary={summary} byContentType={report.byContentType} goals={goals} objectives={objectives} quarters={quarters} />
    </div>
  );
}
