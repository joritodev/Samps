import { UserType } from "@prisma/client";
import {
  dailyMessage,
  greeting,
  isDailySummaryAudience,
  previousWorkday,
  workdayBefore,
} from "@/lib/agency/daily-summary";
import { OPEN_EXCLUDED } from "@/lib/agency/demand-filters";
import { addDays, dayKey, endOfDayMs, startOfDayMs } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { listLedSectorIds } from "@/lib/permissions/led-sectors";
import { evaluateGoals, listGoalsForUser, type GoalView } from "@/lib/services/goals.service";
import {
  evaluateObjectives,
  listObjectivesForUser,
  objectiveViewer,
  type ObjectiveView,
} from "@/lib/services/okr.service";
import { getPerformanceSummary } from "@/lib/services/performance-summary.service";
import type { SessionUser } from "@/types/auth";

const MAX_GOALS = 3;
const MAX_OBJECTIVES = 2;
const SCOPE_ORDER = { USER: 0, SECTOR: 1, AGENCY: 2 } as const;

export type DailySummaryContent = {
  greeting: string;
  title: string;
  detail: string;
  dayLabel: string;
  completed: number;
  onTimeRate: number | null;
  workedHours: number;
  dueToday: number;
  overdue: number;
  adjustments: number;
  goals: GoalView[];
  objectives: ObjectiveView[];
};

/** Metas que dizem respeito à pessoa: as dela, as do setor dela e as da agência. */
export async function relevantGoalsForUser(user: SessionUser, now: Date, limit: number) {
  const rows = await listGoalsForUser(user, { onlyActive: true });
  const mine = rows
    .filter((g) => g.startsOn <= now && g.endsOn >= now)
    .filter((g) => g.scope === "AGENCY" || (g.scope === "SECTOR" && g.sectorId === (user.sectorId ?? null)) || (g.scope === "USER" && g.userId === user.id))
    .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope]);
  return evaluateGoals(mine.slice(0, limit), now);
}

/** Objetivos em andamento de que a pessoa é dona. */
export async function ownedObjectivesForUser(user: SessionUser, now: Date, limit: number) {
  const rows = await listObjectivesForUser(user, { period: "atual", now });
  const owned = rows.filter((o) => o.ownerId === user.id && o.status === "ACTIVE");
  return evaluateObjectives(owned.slice(0, limit), objectiveViewer(user), now);
}

async function alreadySeen(userId: string, day: string) {
  const row = await db.reportSeen.findUnique({
    where: { userId_day: { userId, day } },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Conteúdo do modal do primeiro acesso do dia, ou null quando não cabe:
 * fora do público, já visto hoje, ou sem nada a dizer.
 */
export async function getDailySummaryForModal(
  user: SessionUser,
  now: Date = new Date()
): Promise<DailySummaryContent | null> {
  if (user.userType === UserType.EXTERNAL_CLIENT) return null;
  const ledSectors = await listLedSectorIds(user.id);
  if (!isDailySummaryAudience(user.userType, ledSectors.length)) return null;

  const today = dayKey(now);
  if (await alreadySeen(user.id, today)) return null;

  const day = previousWorkday(now);
  // Compara com o dia útil anterior a ele (não com o dia corrido, que pode ser fim de semana).
  const before = workdayBefore(day.key);
  const [summary, dueToday, goals, objectives] = await Promise.all([
    getPerformanceSummary({
      scope: { userId: user.id },
      range: { from: day.from, to: day.to },
      previousRange: { from: before.from, to: before.to },
      now,
    }),
    db.demand.count({
      where: {
        assigneeId: user.id,
        isChecklistItem: false,
        status: { notIn: OPEN_EXCLUDED },
        dueDate: { gte: new Date(startOfDayMs(today)), lte: new Date(endOfDayMs(today)) },
      },
    }),
    relevantGoalsForUser(user, now, MAX_GOALS),
    ownedObjectivesForUser(user, now, MAX_OBJECTIVES),
  ]);

  const ind = summary.indicators;
  const completed = ind.COMPLETED.value ?? 0;
  const workedHours = ind.WORKED_HOURS.value ?? 0;
  const overdue = ind.OVERDUE.value ?? 0;
  const adjustments = ind.ADJUSTMENTS.value ?? 0;

  const hasContent =
    completed > 0 || workedHours > 0 || dueToday > 0 || overdue > 0 || adjustments > 0 || goals.length > 0 || objectives.length > 0;
  if (!hasContent) return null;

  const dayLabel = day.key === addDays(today, -1) ? "ontem" : "na sexta";
  const message = dailyMessage(
    {
      completed,
      previousCompleted: ind.COMPLETED.previous ?? 0,
      workedSeconds: workedHours * 3600,
    },
    dayLabel === "ontem" ? "ontem" : "na sexta"
  );

  return {
    greeting: greeting(user.name, now),
    ...message,
    dayLabel,
    completed,
    onTimeRate: ind.ON_TIME_RATE.value,
    workedHours,
    dueToday,
    overdue,
    adjustments,
    goals,
    objectives,
  };
}

/** Marca o dia como visto. Só vale para a própria pessoa; repetir não faz mal. */
export async function dismissDailySummary(user: SessionUser, now: Date = new Date()) {
  if (user.userType === UserType.EXTERNAL_CLIENT) {
    throw new Error("Resumo diário não se aplica a este usuário.");
  }
  const day = dayKey(now);
  await db.reportSeen.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day },
    update: {},
  });
}
