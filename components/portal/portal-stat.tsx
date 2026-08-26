import type { LucideIcon } from "lucide-react";

export function PortalStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
