import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricTone =
  | "default"
  | "primary"
  | "brand"
  | "success"
  | "warning"
  | "danger";

/** O tom vira um ponto de cor ao lado do rótulo — o card fica neutro. */
const dotToneClasses: Record<MetricTone, string> = {
  default: "bg-muted-foreground/40",
  primary: "bg-cyan",
  brand: "bg-brand",
  success: "bg-success",
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
        <span
          aria-hidden
          data-slot="metric-dot"
          className={cn("size-1.5 shrink-0 rounded-full", dotToneClasses[tone])}
        />
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
