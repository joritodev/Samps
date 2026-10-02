import { CircleAlert, CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { GOAL_STATUS_LABEL, type GoalStatus } from "@/lib/agency/goals";
import { cn } from "@/lib/utils";

const STYLE: Record<GoalStatus, { icon: typeof CircleCheck; text: string; bar: string }> = {
  met: { icon: CircleCheck, text: "text-success", bar: "bg-success" },
  near: { icon: CircleDot, text: "text-warning", bar: "bg-warning" },
  off: { icon: CircleAlert, text: "text-urgent", bar: "bg-urgent" },
  none: { icon: CircleDashed, text: "text-muted-foreground", bar: "bg-muted-foreground/40" },
};

/** Status da meta: ícone + texto + cor, nunca só cor. */
export function GoalStatusChip({ status, className }: { status: GoalStatus; className?: string }) {
  const { icon: Icon, text } = STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", text, className)}>
      <Icon aria-hidden className="size-3.5" />
      {GOAL_STATUS_LABEL[status]}
    </span>
  );
}

export function GoalProgressBar({ status, progress }: { status: GoalStatus; progress: number | null }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((progress ?? 0) * 100)}
      aria-label="Progresso da meta"
    >
      <div
        className={cn("h-full rounded-full", STYLE[status].bar)}
        style={{ width: `${Math.max(progress === null ? 0 : 2, Math.round((progress ?? 0) * 100))}%` }}
      />
    </div>
  );
}
