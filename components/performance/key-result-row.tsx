import { ConfidenceBar, ConfidenceChip } from "@/components/performance/confidence-chip";
import { formatKrRange, formatKrValue, formatProgress } from "@/lib/agency/okr-format";
import { shortDay } from "@/lib/agency/performance-format";
import { dayKey } from "@/lib/agency/sp-calendar";
import type { KeyResultView } from "@/lib/services/okr.service";

/** Evolução dos check-ins: pontos ligados, do mais antigo ao mais recente. */
function Sparkline({ kr }: { kr: KeyResultView }) {
  const points = [...kr.history].reverse();
  if (points.length < 2) return null;
  const values = [kr.startValue, kr.targetValue, ...points.map((p) => p.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 220;
  const H = 48;
  const x = (i: number) => 6 + (i * (W - 12)) / (points.length - 1);
  const y = (v: number) => H - 6 - ((v - min) / span) * (H - 12);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-12 w-full max-w-[220px]"
      role="img"
      aria-label={`Evolução em ${points.length} check-ins, de ${formatKrValue(kr, points[0]!.value)} a ${formatKrValue(kr, points[points.length - 1]!.value)}`}
    >
      <line x1={6} x2={W - 6} y1={y(kr.targetValue)} y2={y(kr.targetValue)} className="stroke-muted-foreground/40" strokeDasharray="3 3" />
      <polyline fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} />
      {points.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(p.value)} r={3.5} className="fill-primary stroke-card" strokeWidth={2} />
      ))}
    </svg>
  );
}

export function KeyResultRow({ kr, actions }: { kr: KeyResultView; actions?: React.ReactNode }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{kr.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kr.kind === "KPI" ? "Automático" : "Manual"} · {formatKrRange(kr)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-sm font-semibold text-foreground">{formatKrValue(kr, kr.current)}</p>
          <p className="num text-xs text-muted-foreground">{formatProgress(kr.progress)}</p>
        </div>
      </div>
      <div className="mt-2">
        <ConfidenceBar confidence={kr.confidence} progress={kr.progress} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <ConfidenceChip confidence={kr.confidence} />
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {kr.history.length > 0 ? (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {kr.history.length === 1 ? "1 check-in" : `${kr.history.length} últimos check-ins`}
          </summary>
          <div className="mt-2 space-y-2">
            <Sparkline kr={kr} />
            <ul className="space-y-1">
              {kr.history.map((c) => (
                <li key={c.id} className="text-muted-foreground">
                  <span className="num font-medium text-foreground">{formatKrValue(kr, c.value)}</span>
                  {" · "}
                  {shortDay(dayKey(new Date(c.createdAt)))} · {c.authorName}
                  {c.note ? <span className="block">{c.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </li>
  );
}
