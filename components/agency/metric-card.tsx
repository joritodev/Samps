import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricTone =
  | "default"
  | "primary"
  | "brand"
  | "success"
  | "warning"
  | "danger";

/** Só tons de alerta ganham ponto: cor aparece quando carrega significado. */
const dotToneClasses: Partial<Record<MetricTone, string>> = {
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** Só alerta (perigo/atenção) colore o número; o resto fica em tinta. */
const valueToneClasses: Record<MetricTone, string> = {
  default: "text-foreground",
  primary: "text-foreground",
  brand: "text-foreground",
  success: "text-foreground",
  warning: "text-warning",
  danger: "text-destructive",
};

export function MetricCard({
  label,
  value,
  tone = "default",
  variant = "card",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: MetricTone;
  /** `plain` = sem moldura, para faixas de KPI dentro de um único card. */
  variant?: "card" | "plain";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 px-3.5 py-3",
        variant === "card" &&
          "rounded-lg border border-border/80 bg-card shadow-xs",
        className
      )}
    >
      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
        {dotToneClasses[tone] ? (
          <span
            aria-hidden
            data-slot="metric-dot"
            className={cn("size-1.5 shrink-0 rounded-full", dotToneClasses[tone])}
          />
        ) : null}
        {label}
      </p>
      <p
        className={cn(
          "num mt-1 text-2xl font-semibold leading-none",
          valueToneClasses[tone]
        )}
      >
        {value}
      </p>
    </div>
  );
}
