import { ArrowDown, ArrowUp } from "lucide-react";
import { formatComparison, formatKpiValue } from "@/lib/agency/performance-format";
import type { KpiResult } from "@/lib/agency/performance-summary";
import { cn } from "@/lib/utils";

const TREND_TEXT = {
  better: "text-success",
  worse: "text-urgent",
  same: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

/** Número grande + comparação com o período anterior. Cor só quando há juízo. */
export function KpiTile({ kpi, alert }: { kpi: KpiResult; alert?: boolean }) {
  const { text, trend } = formatComparison(kpi);
  const Arrow = kpi.delta !== null && kpi.delta > 0 ? ArrowUp : ArrowDown;
  const showArrow = trend === "better" || trend === "worse";

  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-xs">
      <p className="truncate text-xs font-medium text-muted-foreground">{kpi.label}</p>
      <p
        className={cn(
          "num mt-1.5 text-3xl font-semibold leading-none",
          alert ? "text-urgent" : "text-foreground"
        )}
      >
        {formatKpiValue(kpi.value, kpi.unit)}
      </p>
      <p className={cn("mt-2 flex items-start gap-1 text-xs font-medium", TREND_TEXT[trend])}>
        {showArrow ? <Arrow aria-hidden className="mt-px size-3 shrink-0" /> : null}
        <span>{text}</span>
      </p>
    </div>
  );
}
