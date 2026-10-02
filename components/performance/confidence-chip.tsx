import { CircleAlert, CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { CONFIDENCE_LABEL, type Confidence } from "@/lib/agency/okr";
import { cn } from "@/lib/utils";

const STYLE = {
  ON_TRACK: { icon: CircleCheck, text: "text-success", bar: "bg-success" },
  AT_RISK: { icon: CircleDot, text: "text-warning", bar: "bg-warning" },
  OFF_TRACK: { icon: CircleAlert, text: "text-urgent", bar: "bg-urgent" },
} as const;

/** Confiança: ícone + texto + cor, nunca só cor. Sem leitura mostra traço. */
export function ConfidenceChip({ confidence, className }: { confidence: Confidence | null; className?: string }) {
  if (!confidence) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", className)}>
        <CircleDashed aria-hidden className="size-3.5" />
        Sem leitura
      </span>
    );
  }
  const { icon: Icon, text } = STYLE[confidence];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", text, className)}>
      <Icon aria-hidden className="size-3.5" />
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

export function ConfidenceBar({ confidence, progress }: { confidence: Confidence | null; progress: number | null }) {
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Progresso"
    >
      <div
        className={cn("h-full rounded-full", confidence ? STYLE[confidence].bar : "bg-muted-foreground/40")}
        style={{ width: `${progress === null ? 0 : Math.max(2, pct)}%` }}
      />
    </div>
  );
}
