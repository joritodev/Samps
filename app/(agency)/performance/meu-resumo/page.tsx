import Link from "next/link";
import { AttentionPanel } from "@/components/performance/attention-panel";
import { DailyChart } from "@/components/performance/daily-chart";
import { GoalsStrip } from "@/components/performance/goals-strip";
import { HeadlineCard } from "@/components/performance/headline-card";
import { KpiTile } from "@/components/performance/kpi-tile";
import { MySummaryActions } from "@/components/performance/my-summary-actions";
import { ObjectivesStrip } from "@/components/performance/objectives-strip";
import { previousWorkday } from "@/lib/agency/daily-summary";
import { resolvePerformanceRange } from "@/lib/agency/performance-period";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { ownedObjectivesForUser, relevantGoalsForUser } from "@/lib/services/daily-summary.service";
import { getPerformanceSummary } from "@/lib/services/performance-summary.service";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "ontem", label: "Último dia útil" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Mês atual" },
] as const;

const KPIS = ["COMPLETED", "ON_TIME_RATE", "REWORK_RATE", "WORKED_HOURS", "AVG_LEAD_TIME_DAYS"] as const;

/** Metas e objetivos são extras: se falharem, o resumo da pessoa continua. */
async function orEmpty<T>(label: string, work: Promise<T[]>): Promise<T[]> {
  try {
    return await work;
  } catch (error) {
    console.error(`[meu-resumo] ${label} falhou`, error);
    return [];
  }
}

export const maxDuration = 30;

export default async function MySummaryPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const user = await requireAuth();
  const analytics = hasPermission(user.permissions, "productivity.view");
  const period = PERIODS.find((p) => p.value === searchParams.periodo)?.value ?? "semana";
  const now = new Date();
  const range =
    period === "ontem"
      ? previousWorkday(now)
      : resolvePerformanceRange({ preset: period === "mes" ? "month" : "week", now });

  const [summary, goals, objectives] = await Promise.all([
    getPerformanceSummary({ scope: { userId: user.id }, range: { from: range.from, to: range.to }, now }),
    orEmpty("metas", relevantGoalsForUser(user, now, 6)),
    orEmpty("objetivos", ownedObjectivesForUser(user, now, 4)),
  ]);

  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold text-foreground">Meu resumo · {user.name}</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Período do resumo" className="flex flex-wrap gap-1.5 print:hidden">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={p.value === "semana" ? "/performance/meu-resumo" : `/performance/meu-resumo?periodo=${p.value}`}
              aria-current={period === p.value ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <MySummaryActions summary={summary} />
      </div>

      <HeadlineCard summary={summary} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KPIS.map((key) => (
          <KpiTile key={key} kpi={summary.indicators[key]} />
        ))}
      </div>

      <ObjectivesStrip objectives={objectives} title="Seus objetivos" showLink={analytics} />
      <GoalsStrip goals={goals} showLink={analytics} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Entregas por dia</h2>
          <DailyChart points={summary.series} />
        </section>
        <AttentionPanel summary={summary} />
      </div>
    </div>
  );
}
