import type { ReactNode } from "react";
import Link from "next/link";
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
  href,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: MetricTone;
  /** `plain` = sem moldura, para faixas de KPI dentro de um único card. */
  variant?: "card" | "plain";
  /** Número clicável: leva à lista que ele conta. */
  href?: string;
  /** Explica o que o número conta (tooltip nativo + texto para leitor de tela). */
  hint?: string;
  className?: string;
}) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper
      href={href as string}
      title={hint}
      className={cn(
        "min-w-0 px-3.5 py-3",
        variant === "card" &&
          "rounded-lg border border-border/80 bg-card shadow-xs",
        href &&
          "group block transition-colors hover:bg-secondary/70 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
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
      {hint ? <span className="sr-only">{hint}</span> : null}
    </Wrapper>
  );
}
