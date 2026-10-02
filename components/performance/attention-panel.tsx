import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { demandFilterHref } from "@/lib/agency/demand-filters";
import type { PerformanceSummary } from "@/lib/agency/performance-summary";

function Row({
  count,
  label,
  detail,
  href,
}: {
  count: number;
  label: string;
  detail?: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="num inline-flex min-w-9 justify-center rounded-full bg-urgent/10 px-2 py-0.5 text-sm font-semibold text-urgent">
          {count}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
        </span>
        <ArrowRight aria-hidden className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </Link>
    </li>
  );
}

/** O que pede ação agora; cada linha leva ao quadro já filtrado. */
export function AttentionPanel({ summary }: { summary: PerformanceSummary }) {
  const { OVERDUE, UNASSIGNED_OPEN, ADJUSTMENTS } = summary.indicators;
  const overdue = OVERDUE.value ?? 0;
  const unassigned = UNASSIGNED_OPEN.value ?? 0;
  const adjustments = ADJUSTMENTS.value ?? 0;
  const bySector = summary.overdueBySector
    .slice(0, 3)
    .map((s) => `${s.count} em ${s.name}`)
    .join(" · ");

  return (
    <section className="flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <h2 className="text-sm font-semibold text-foreground">Pede atenção</h2>
      {overdue + unassigned + adjustments === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-celebration">
          <PartyPopper aria-hidden className="size-4" />
          Nada pedindo atenção agora.
        </p>
      ) : (
        <ul className="-mx-2 mt-2 space-y-0.5">
          {overdue > 0 ? (
            <Row
              count={overdue}
              label={overdue === 1 ? "demanda atrasada" : "demandas atrasadas"}
              detail={bySector}
              href={demandFilterHref("atrasadas")}
            />
          ) : null}
          {unassigned > 0 ? (
            <Row
              count={unassigned}
              label={unassigned === 1 ? "demanda sem responsável" : "demandas sem responsável"}
              href={demandFilterHref("sem-responsavel")}
            />
          ) : null}
          {adjustments > 0 ? (
            <Row
              count={adjustments}
              label={adjustments === 1 ? "demanda em ajuste" : "demandas em ajuste"}
              detail="voltaram da revisão"
              href={demandFilterHref("ajustes")}
            />
          ) : null}
        </ul>
      )}
      <p className="mt-auto pt-3 text-xs text-muted-foreground">
        Valores de agora, não do período escolhido.
      </p>
    </section>
  );
}
