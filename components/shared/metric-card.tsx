import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "teal" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        tone === "default" && "border-border",
        tone === "danger" &&
          "border-destructive/40 dark:border-destructive/35 dark:bg-destructive/10",
        tone === "teal" &&
          "border-emerald-500/35 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/10",
        tone === "primary" &&
          "border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground",
          tone === "danger" && "text-destructive",
          tone === "primary" && "text-primary",
          tone === "teal" && "text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}
