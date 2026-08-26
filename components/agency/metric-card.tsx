import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricTone =
  | "default"
  | "primary"
  | "brand"
  | "success"
  | "warning"
  | "danger";

const toneClasses: Record<MetricTone, string> = {
  default: "border-border bg-card",
  primary: "border-primary/35 bg-primary/5",
  brand: "border-brand/35 bg-brand/5",
  success: "border-success/35 bg-success/5",
  warning: "border-warning/35 bg-warning/5",
  danger: "border-destructive/35 bg-destructive/5",
};

export function MetricCard({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        toneClasses[tone],
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
