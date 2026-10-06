import { Prisma, UserStatus, UserType, type Goal } from "@prisma/client";
import {
  canViewGoal,
  evaluateGoal,
  goalPeriodState,
  parseGoalInput,
  periodsOverlap,
  type GoalDraft,
  type GoalEvaluation,
  type GoalInput,
  type GoalPeriodState,
  type GoalScope,
} from "@/lib/agency/goals";
import type { KpiKey } from "@/lib/agency/performance-summary";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";
import {
  getPerformanceSummary,
  type SummaryScope,
} from "@/lib/services/performance-summary.service";
import type { SessionUser } from "@/types/auth";

/** Metas avaliadas por página; passa disso, as mais recentes ficam de fora. */
export const MAX_EVALUATED_GOALS = 30;

export type GoalView = {
  id: string;
  metric: KpiKey;
  scope: GoalScope;
  sectorId: string | null;
  sectorName: string | null;
  userId: string | null;
  userName: string | null;
  target: number;
  warnMargin: number;
  startsOn: string;
  endsOn: string;
  note: string | null;
  active: boolean;
  state: GoalPeriodState;
  actual: number | null;
} & GoalEvaluation;

function assertCanManage(user: SessionUser) {
  if (
    user.userType === UserType.EXTERNAL_CLIENT ||
    !hasPermission(user.permissions, "goals.manage")
  ) {
    throw new Error("Você não tem permissão para gerenciar metas.");
  }
}

function viewerOf(user: SessionUser) {
  return {
    id: user.id,
    sectorId: user.sectorId ?? null,
    canManage:
      user.userType !== UserType.EXTERNAL_CLIENT &&
      hasPermission(user.permissions, "goals.manage"),
  };
}

type GoalRow = Goal & {
  sector: { name: string } | null;
  user: { name: string } | null;
};

const withNames = {
  sector: { select: { name: true } },
  user: { select: { name: true } },
} as const;

/** Metas que a pessoa pode ver, mais recentes primeiro. */
export async function listGoalsForUser(
  user: SessionUser,
  filter: { onlyActive?: boolean } = {}
): Promise<GoalRow[]> {
  if (user.userType === UserType.EXTERNAL_CLIENT) return [];
  const viewer = viewerOf(user);
  const rows = await db.goal.findMany({
    where: {
      ...(filter.onlyActive ? { active: true } : {}),
      ...(viewer.canManage
        ? {}
        : {
            OR: [
              { scope: "AGENCY" },
              ...(viewer.sectorId ? [{ scope: "SECTOR" as const, sectorId: viewer.sectorId }] : []),
              { scope: "USER" as const, userId: viewer.id },
            ],
          }),
    },
    include: withNames,
    orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
  });
  // Segunda barreira: a regra pura é a fonte da verdade da visibilidade.
  return rows.filter((g) => canViewGoal(g, viewer));
}

/**
 * Metas vigentes da agência (e do setor, se pedido). Uso interno de rotinas do
 * sistema (e-mails); não filtra por pessoa.
 */
export async function listRunningGoals(
  scope: { sectorId?: string },
  now: Date = new Date()
): Promise<GoalRow[]> {
  return db.goal.findMany({
    where: {
      active: true,
      startsOn: { lte: now },
      endsOn: { gte: now },
      OR: [{ scope: "AGENCY" }, ...(scope.sectorId ? [{ scope: "SECTOR" as const, sectorId: scope.sectorId }] : [])],
    },
    include: withNames,
    orderBy: [{ scope: "asc" }, { createdAt: "asc" }],
  });
}

function elapsedOf(goal: Pick<Goal, "startsOn" | "endsOn">, now: Date): number {
  const total = goal.endsOn.getTime() - goal.startsOn.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - goal.startsOn.getTime()) / total));
}

function scopeOf(goal: Pick<Goal, "scope" | "sectorId" | "userId">): SummaryScope {
  if (goal.scope === "SECTOR") return { sectorId: goal.sectorId ?? undefined };
  if (goal.scope === "USER") return { userId: goal.userId ?? undefined };
  return {};
}

/**
 * Valor atual de cada meta: o indicador no período da meta (até hoje), no
 * recorte dela. Metas com o mesmo recorte e período dividem uma consulta.
 */
export async function evaluateGoals(
  goals: GoalRow[],
  now: Date = new Date()
): Promise<GoalView[]> {
  const evaluated = goals.slice(0, MAX_EVALUATED_GOALS);
  const groups = new Map<string, Promise<Awaited<ReturnType<typeof getPerformanceSummary>>>>();

  const readings = await Promise.all(
    evaluated.map(async (goal) => {
      const state = goalPeriodState(goal, now);
      if (state === "upcoming") return null;
      const to = goal.endsOn < now ? goal.endsOn : now;
      const key = `${goal.scope}|${goal.sectorId}|${goal.userId}|${goal.startsOn.getTime()}|${to.getTime()}`;
      let summary = groups.get(key);
      if (!summary) {
        summary = getPerformanceSummary({
          scope: scopeOf(goal),
          range: { from: goal.startsOn, to },
          now,
        });
        groups.set(key, summary);
      }
      return (await summary).indicators[goal.metric as KpiKey].value;
    })
  );

  return evaluated.map((goal, i) => {
    const actual = readings[i] ?? null;
    return {
      id: goal.id,
      metric: goal.metric as KpiKey,
      scope: goal.scope,
      sectorId: goal.sectorId,
      sectorName: goal.sector?.name ?? null,
      userId: goal.userId,
      userName: goal.user?.name ?? null,
      target: goal.target,
      warnMargin: goal.warnMargin,
      startsOn: goal.startsOn.toISOString(),
      endsOn: goal.endsOn.toISOString(),
      note: goal.note,
      active: goal.active,
      state: goalPeriodState(goal, now),
      actual,
      ...evaluateGoal(goal.metric as KpiKey, goal.target, goal.warnMargin, actual, elapsedOf(goal, now)),
    };
  });
}

async function assertValidTarget(draft: GoalDraft, selfId?: string) {
  if (draft.sectorId) {
    const sector = await db.sector.findUnique({
      where: { id: draft.sectorId },
      select: { isActive: true },
    });
    if (!sector?.isActive) throw new Error("Setor não encontrado.");
  }
  if (draft.userId) {
    const person = await db.user.findUnique({
      where: { id: draft.userId },
      select: { status: true, userType: true },
    });
    if (
      !person ||
      person.status !== UserStatus.ACTIVE ||
      person.userType === UserType.EXTERNAL_CLIENT
    ) {
      throw new Error("Pessoa não encontrada.");
    }
  }
  const sameTarget = await db.goal.findMany({
    where: {
      active: true,
      metric: draft.metric,
      scope: draft.scope,
      sectorId: draft.sectorId,
      userId: draft.userId,
      ...(selfId ? { NOT: { id: selfId } } : {}),
    },
    select: { startsOn: true, endsOn: true },
  });
  if (sameTarget.some((other) => periodsOverlap(draft, other))) {
    throw new Error("Já existe uma meta ativa para este indicador e este período.");
  }
}

function snapshot(goal: Goal): Prisma.InputJsonValue {
  return {
    metric: goal.metric,
    scope: goal.scope,
    sectorId: goal.sectorId,
    userId: goal.userId,
    target: goal.target,
    warnMargin: goal.warnMargin,
    startsOn: goal.startsOn.toISOString(),
    endsOn: goal.endsOn.toISOString(),
    active: goal.active,
  };
}

function parseOrThrow(input: GoalInput): GoalDraft {
  const parsed = parseGoalInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

export async function createGoal(user: SessionUser, input: GoalInput) {
  assertCanManage(user);
  const draft = parseOrThrow(input);
  await assertValidTarget(draft);
  const goal = await db.goal.create({ data: { ...draft, createdById: user.id } });
  await logAudit({
    userId: user.id,
    action: "GOAL_CREATED",
    entityType: "Goal",
    entityId: goal.id,
    newValue: snapshot(goal),
  });
  return goal;
}

export async function updateGoal(user: SessionUser, id: string, input: GoalInput) {
  assertCanManage(user);
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing) throw new Error("Meta não encontrada.");
  const draft = parseOrThrow(input);
  if (existing.active) await assertValidTarget(draft, id);
  const goal = await db.goal.update({ where: { id }, data: draft });
  await logAudit({
    userId: user.id,
    action: "GOAL_UPDATED",
    entityType: "Goal",
    entityId: id,
    previousValue: snapshot(existing),
    newValue: snapshot(goal),
  });
  return goal;
}

export async function setGoalActive(user: SessionUser, id: string, active: boolean) {
  assertCanManage(user);
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing) throw new Error("Meta não encontrada.");
  if (existing.active === active) return existing;
  if (active) await assertValidTarget(existing, id);
  const goal = await db.goal.update({ where: { id }, data: { active } });
  await logAudit({
    userId: user.id,
    action: "GOAL_UPDATED",
    entityType: "Goal",
    entityId: id,
    previousValue: snapshot(existing),
    newValue: snapshot(goal),
  });
  return goal;
}

export async function deleteGoal(user: SessionUser, id: string) {
  assertCanManage(user);
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing) throw new Error("Meta não encontrada.");
  await db.goal.delete({ where: { id } });
  await logAudit({
    userId: user.id,
    action: "GOAL_DELETED",
    entityType: "Goal",
    entityId: id,
    previousValue: snapshot(existing),
  });
}
