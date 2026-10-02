import Link from "next/link";
import { ConfidenceBar, ConfidenceChip } from "@/components/performance/confidence-chip";
import { formatProgress } from "@/lib/agency/okr-format";
import type { ObjectiveView } from "@/lib/services/okr.service";

const VISIBLE = 4;

/** Objetivos da agência em andamento: o painel executivo da Visão geral. */
export function ObjectivesStrip({
  objectives,
  title = "Objetivos da agência",
  showLink = true,
}: {
  objectives: ObjectiveView[];
  title?: string;
  /** Esconde o link para a aba OKRs de quem não tem Performance completa. */
  showLink?: boolean;
}) {
  if (objectives.length === 0) return null;
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {showLink ? (
        <Link href="/performance/okrs" className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {objectives.length > VISIBLE ? `Ver todos (${objectives.length})` : "Ver OKRs"}
          </Link>
        ) : null}
      </div>
      <ul className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {objectives.slice(0, VISIBLE).map((o) => (
          <li key={o.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-foreground">{o.title}</p>
              <p className="num shrink-0 text-sm text-foreground">{formatProgress(o.progress)}</p>
            </div>
            <div className="mt-1.5">
              <ConfidenceBar confidence={o.confidence} progress={o.progress} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {o.keyResults.length === 1 ? "1 resultado-chave" : `${o.keyResults.length} resultados-chave`}
              </span>
              <ConfidenceChip confidence={o.confidence} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
