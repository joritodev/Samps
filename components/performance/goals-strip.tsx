import Link from "next/link";
import { GoalReading } from "@/components/performance/goal-row";
import type { GoalView } from "@/lib/services/goals.service";

const VISIBLE = 6;

/** Metas vigentes do recorte escolhido, na Visão geral. */
export function GoalsStrip({ goals, showLink = true }: { goals: GoalView[]; showLink?: boolean }) {
  if (goals.length === 0) return null;
  const shown = goals.slice(0, VISIBLE);
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Metas em andamento</h2>
        {showLink ? (
        <Link
            href="/performance/metas"
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {goals.length > VISIBLE ? `Ver todas (${goals.length})` : "Ver metas"}
          </Link>
        ) : null}
      </div>
      <ul className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {shown.map((goal) => (
          <li key={goal.id}>
            <GoalReading goal={goal} />
          </li>
        ))}
      </ul>
    </section>
  );
}
