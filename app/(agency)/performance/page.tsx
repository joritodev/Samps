import { PerformanceFilters } from "@/components/performance/performance-filters";
import { PerformanceOverview } from "@/components/performance/performance-overview";
import { getPerformanceReport } from "@/lib/services/performance.service";
import { getPerformanceSummary } from "@/lib/services/performance-summary.service";
import { GoalsBlock, ObjectivesBlock, QuarterHistoryBlock } from "./_blocks";
import { loadPerformanceContext, type PerformanceSearchParams } from "./_context";

// A Visão geral faz várias consultas; o limite padrão da Vercel (10 s) é apertado.
export const maxDuration = 30;

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: PerformanceSearchParams;
}) {
  const { user, range, previousRange, scope, filters } = await loadPerformanceContext(searchParams);

  const [summary, report] = await Promise.all([
    getPerformanceSummary({ scope, range, previousRange }),
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
      <PerformanceOverview
        summary={summary}
        byContentType={report.byContentType}
        objectives={<ObjectivesBlock user={user} scope={scope} />}
        goals={<GoalsBlock user={user} scope={scope} />}
        history={<QuarterHistoryBlock scope={scope} />}
      />
    </div>
  );
}
