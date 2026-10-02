import { UserStatus, UserType } from "@prisma/client";
import { dayKey } from "@/lib/agency/sp-calendar";
import {
  describeTarget,
  endedRecently,
  GOAL_SCOPE_LABEL,
} from "@/lib/agency/goals";
import { formatKpiValue, shortDay } from "@/lib/agency/performance-format";
import { KPI_CATALOG } from "@/lib/agency/performance-summary";
import { db } from "@/lib/db";
import { evaluateGoals } from "@/lib/services/goals.service";
import { createNotification } from "@/lib/services/notifications.service";

const DEDUPE_DAYS = 7;

export type CelebrationResult = { considered: number; celebrated: number; notified: number; duplicates: number };

/**
 * Celebra no fechamento: metas cujo período acabou nos últimos 2 dias e cujo
 * resultado final bateu o alvo. Avisa a gestão e quem é dono da meta (líder
 * do setor, a própria pessoa). Não repete o mesmo aviso em 7 dias.
 */
export async function runGoalCelebrations(now: Date = new Date()): Promise<CelebrationResult> {
  const result: CelebrationResult = { considered: 0, celebrated: 0, notified: 0, duplicates: 0 };
  const since = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const goals = (
    await db.goal.findMany({
      where: { active: true, endsOn: { gte: since, lte: now } },
      include: {
        sector: { select: { name: true, leaderId: true } },
        user: { select: { name: true } },
      },
    })
  ).filter((g) => endedRecently(g, now));
  result.considered = goals.length;
  if (goals.length === 0) return result;

  const managers = await db.user.findMany({
    where: { status: UserStatus.ACTIVE, userType: { in: [UserType.ADMIN, UserType.MANAGEMENT] } },
    select: { id: true },
  });
  const views = await evaluateGoals(goals, now);
  const dedupeFrom = new Date(now.getTime() - DEDUPE_DAYS * 24 * 60 * 60 * 1000);

  for (const view of views) {
    if (view.status !== "met") continue;
    const goal = goals.find((g) => g.id === view.id)!;
    result.celebrated += 1;

    const meta = KPI_CATALOG[view.metric];
    const subject =
      view.scope === "SECTOR" ? (view.sectorName ?? "Setor") : view.scope === "USER" ? (view.userName ?? "Pessoa") : GOAL_SCOPE_LABEL.AGENCY;
    const title = `Meta batida: ${meta.label} (${subject}, ${shortDay(dayKey(goal.startsOn))} a ${shortDay(dayKey(goal.endsOn))})`;
    const message = `Alvo ${describeTarget(view.metric, view.target)}; resultado ${formatKpiValue(view.actual, meta.unit)}. Parabéns!`;

    const recipients = new Set(managers.map((m) => m.id));
    if (view.scope === "SECTOR" && goal.sector?.leaderId) recipients.add(goal.sector.leaderId);
    if (view.scope === "USER" && goal.userId) recipients.add(goal.userId);

    for (const userId of Array.from(recipients)) {
      const already = await db.notification.findFirst({
        where: { userId, title, createdAt: { gte: dedupeFrom } },
        select: { id: true },
      });
      if (already) {
        result.duplicates += 1;
        continue;
      }
      const created = await createNotification({ userId, type: "OTHER", title, message, link: "/performance/metas" });
      if (created) result.notified += 1;
    }
  }
  return result;
}
