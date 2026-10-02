import { AttentionPanel } from "@/components/performance/attention-panel";
import { DailyChart } from "@/components/performance/daily-chart";
import { HeadlineCard } from "@/components/performance/headline-card";
import { KpiTile } from "@/components/performance/kpi-tile";
import { RankBars } from "@/components/performance/rank-bars";
import { formatDuration } from "@/lib/agency/performance-format";
import type { PerformanceSummary } from "@/lib/agency/performance-summary";
import type { ContentTypeStats } from "@/lib/services/performance.service";

const MAIN_KPIS = [
  "COMPLETED",
  "ON_TIME_RATE",
  "REWORK_RATE",
  "WORKED_HOURS",
  "AVG_LEAD_TIME_DAYS",
] as const;

export function PerformanceOverview({
  summary,
  byContentType,
}: {
  summary: PerformanceSummary;
  byContentType: ContentTypeStats[];
}) {
  const { indicators } = summary;
  const maxDeliveries = Math.max(1, ...summary.topDeliverers.map((d) => d.deliveries));
  const types = byContentType.filter((t) => t.avgSeconds !== null).slice(0, 5);
  const maxSeconds = Math.max(1, ...types.map((t) => t.avgSeconds ?? 0));

  return (
    <div className="space-y-4">
      <HeadlineCard summary={summary} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {MAIN_KPIS.map((key) => (
          <KpiTile key={key} kpi={indicators[key]} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Entregas por dia</h2>
          <DailyChart points={summary.series} />
        </section>
        <AttentionPanel summary={summary} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RankBars
          title="Quem mais entregou"
          empty="Nenhuma entrega com responsável no período."
          items={summary.topDeliverers.map((d) => ({
            key: d.userId,
            label: d.name,
            ratio: d.deliveries / maxDeliveries,
            value:
              d.onTimeRate === null
                ? `${d.deliveries} entregas`
                : `${d.deliveries} · ${Math.round(d.onTimeRate * 100)}% no prazo`,
          }))}
        />
        <RankBars
          title="Tempo médio por tipo"
          empty="Nenhum tipo de conteúdo entregue no período."
          items={types.map((t) => ({
            key: t.contentTypeId ?? "sem-tipo",
            label: t.name,
            ratio: (t.avgSeconds ?? 0) / maxSeconds,
            value: `${formatDuration(t.avgSeconds)} · ${t.n}`,
          }))}
        />
      </div>
    </div>
  );
}
