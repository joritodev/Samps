import { GoalProgressBar, GoalStatusChip } from "@/components/performance/goal-status";
import { formatKpiValue, shortDay } from "@/lib/agency/performance-format";
import { describeTarget, GOAL_SCOPE_LABEL } from "@/lib/agency/goals";
import { dayKey } from "@/lib/agency/sp-calendar";
import { KPI_CATALOG } from "@/lib/agency/performance-summary";
import type { GoalView } from "@/lib/services/goals.service";

export function goalSubject(goal: GoalView) {
  if (goal.scope === "SECTOR") return goal.sectorName ?? "Setor";
  if (goal.scope === "USER") return goal.userName ?? "Pessoa";
  return GOAL_SCOPE_LABEL.AGENCY;
}

export function goalPeriodText(goal: Pick<GoalView, "startsOn" | "endsOn">) {
  return `${shortDay(dayKey(new Date(goal.startsOn)))} a ${shortDay(dayKey(new Date(goal.endsOn)))}`;
}

/** Linha de leitura de uma meta: indicador, alvo, valor atual, status e barra. */
export function GoalReading({ goal, showSubject = true }: { goal: GoalView; showSubject?: boolean }) {
  const meta = KPI_CATALOG[goal.metric];
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="min-w-0 text-sm font-medium text-foreground">
          {meta.label}
          <span className="ml-1.5 font-normal text-muted-foreground">
            {describeTarget(goal.metric, goal.target)}
          </span>
        </p>
        <p className="num text-sm text-foreground">
          {goal.state === "upcoming" ? "—" : formatKpiValue(goal.actual, meta.unit)}
        </p>
      </div>
      <div className="mt-1.5">
        <GoalProgressBar status={goal.status} progress={goal.progress} />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
        <span>
          {showSubject ? `${goalSubject(goal)} · ` : ""}
          {goalPeriodText(goal)}
        </span>
        {goal.state === "upcoming" ? <span>Começa em {shortDay(dayKey(new Date(goal.startsOn)))}</span> : <GoalStatusChip status={goal.status} />}
      </div>
    </div>
  );
}
