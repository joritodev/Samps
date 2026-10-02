import { Badge } from "@/components/ui/badge";
import { shortDay } from "@/lib/agency/performance-format";
import { dayKey } from "@/lib/agency/sp-calendar";
import type { PerformanceSummary } from "@/lib/agency/performance-summary";

export function HeadlineCard({ summary }: { summary: PerformanceSummary }) {
  const from = shortDay(dayKey(summary.range.from));
  const to = shortDay(dayKey(summary.range.to));
  return (
    <section
      aria-label="Resumo do período"
      className="rounded-xl border border-border/80 border-l-4 border-l-primary bg-card px-5 py-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>
          {from === to ? from : `${from} a ${to}`} · comparado com o período anterior
        </span>
        {summary.smallSample ? <Badge variant="warning">Amostra pequena</Badge> : null}
      </div>
      <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
        {summary.headline}
      </p>
    </section>
  );
}
