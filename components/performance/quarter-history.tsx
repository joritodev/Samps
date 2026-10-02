import { formatKpiValue } from "@/lib/agency/performance-format";
import type { QuarterRow } from "@/lib/services/performance-summary.service";

/** Trimestre a trimestre: o atual (parcial) ao lado dos três anteriores. */
export function QuarterHistory({ rows }: { rows: QuarterRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.completed));
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <h2 className="text-sm font-semibold text-foreground">Trimestre a trimestre</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Trimestre</th>
              <th className="pb-2 pr-3 font-medium">Concluídas</th>
              <th className="pb-2 pr-3 text-right font-medium">No prazo</th>
              <th className="pb-2 pr-3 text-right font-medium">Retrabalho</th>
              <th className="pb-2 text-right font-medium">Tempo trabalhado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border/60">
                <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                  {r.label}
                  {r.partial ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">até hoje</span> : null}
                </th>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="num w-8 text-right text-foreground">{r.completed}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${r.completed === 0 ? 0 : Math.max(3, Math.round((r.completed / max) * 100))}%` }} />
                    </div>
                  </div>
                </td>
                <td className="num py-2 pr-3 text-right text-foreground">{formatKpiValue(r.onTimeRate, "percent")}</td>
                <td className="num py-2 pr-3 text-right text-foreground">{formatKpiValue(r.reworkRate, "percent")}</td>
                <td className="num py-2 text-right text-foreground">{formatKpiValue(r.workedHours, "hours")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
