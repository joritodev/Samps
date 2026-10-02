import {
  Prisma,
  UserStatus,
  UserType,
  type Confidence as DbConfidence,
  type KeyResult,
  type KeyResultCheckIn,
  type Objective,
  type ObjectiveStatus as DbObjectiveStatus,
} from "@prisma/client";
import { presetPeriod, type GoalScope } from "@/lib/agency/goals";
import {
  canBeParent,
  canViewObjective,
  expectedProgress,
  keyResultConfidence,
  keyResultProgress,
  nextPeriod,
  objectiveProgress,
  parseCheckInInput,
  parseKeyResultInput,
  parseObjectiveInput,
  worstConfidence,
  type CheckInInput,
  type Confidence,
  type KeyResultInput,
  type ObjectiveDraft,
  type ObjectiveInput,
  type ObjectiveStatus,
} from "@/lib/agency/okr";
import type { KpiKey } from "@/lib/agency/performance-summary";
import { endOfDayMs, startOfDayMs } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/resolve";
import { logAudit } from "@/lib/services/audit.service";
import { getPerformanceSummary, type SummaryScope } from "@/lib/services/performance-summary.service";
import type { SessionUser } from "@/types/auth";

export const MAX_EVALUATED_OBJECTIVES = 40;
export const MAX_KEY_RESULTS = 8;
const HISTORY_SIZE = 8;

export type OkrPeriodFilter = "atual" | "anterior" | "todos";

export type CheckInView = {
  id: string;
  value: number;
  confidence: Confidence;
  note: string | null;
  authorName: string;
  createdAt: string;
};

export type KeyResultView = {
  id: string;
  title: string;
  kind: "KPI" | "MANUAL";
  metric: KpiKey | null;
  unit: string | null;
  startValue: number;
  targetValue: number;
  current: number | null;
  progress: number | null;
  confidence: Confidence | null;
  history: CheckInView[];
};

export type ObjectiveView = {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  ownerName: string;
  scope: GoalScope;
  sectorId: string | null;
  sectorName: string | null;
  userId: string | null;
  userName: string | null;
  parentId: string | null;
  startsOn: string;
  endsOn: string;
  status: ObjectiveStatus;
  progress: number | null;
  confidence: Confidence | null;
  /** O viewer pode registrar check-in (dono ou gestão). */
  canCheckIn: boolean;
  keyResults: KeyResultView[];
};

function canManage(user: SessionUser) {
  return (
    user.userType !== UserType.EXTERNAL_CLIENT &&
    hasPermission(user.permissions, "goals.manage")
  );
}

function assertCanManage(user: SessionUser) {
  if (!canManage(user)) throw new Error("Você não tem permissão para gerenciar OKRs.");
}

type ObjectiveRow = Objective & {
  owner: { name: string };
  sector: { name: string } | null;
  user: { name: string } | null;
  keyResults: (KeyResult & {
    checkIns: (KeyResultCheckIn & { author: { name: string } })[];
  })[];
};

const includeAll = {
  owner: { select: { name: true } },
  sector: { select: { name: true } },
  user: { select: { name: true } },
  keyResults: {
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: {
        orderBy: { createdAt: "desc" },
        take: HISTORY_SIZE,
        include: { author: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ObjectiveInclude;

function periodRange(filter: OkrPeriodFilter, now: Date) {
  if (filter === "todos") return null;
  const current = presetPeriod("quarter", now);
  const quarter =
    filter === "atual"
      ? current
      : // O dia anterior ao início do trimestre atual cai no trimestre anterior.
        presetPeriod("quarter", new Date(startOfDayMs(current.startsOn) - 1));
  return {
    from: new Date(startOfDayMs(quarter.startsOn)),
    to: new Date(endOfDayMs(quarter.endsOn)),
  };
}

/** Objetivos que a pessoa pode ver (e que cruzam o período pedido). */
export async function listObjectivesForUser(
  user: SessionUser,
  filter: { period?: OkrPeriodFilter; now?: Date } = {}
): Promise<ObjectiveRow[]> {
  if (user.userType === UserType.EXTERNAL_CLIENT) return [];
  const now = filter.now ?? new Date();
  const range = periodRange(filter.period ?? "atual", now);
  const manage = canManage(user);
  const sectorId = user.sectorId ?? null;
  const rows = await db.objective.findMany({
    where: {
      ...(range ? { startsOn: { lte: range.to }, endsOn: { gte: range.from } } : {}),
      ...(manage
        ? {}
        : {
            OR: [
              { scope: "AGENCY" },
              { ownerId: user.id },
              ...(sectorId ? [{ scope: "SECTOR" as const, sectorId }] : []),
              { scope: "USER" as const, userId: user.id },
            ],
          }),
    },
    include: includeAll,
    orderBy: [{ startsOn: "desc" }, { createdAt: "asc" }],
  });
  return rows.filter((o) => canViewObjective(o, { id: user.id, sectorId, canManage: manage }));
}

/**
 * Objetivos em andamento da agência (e do setor, se pedido) que cruzam `now`.
 * Uso interno de rotinas do sistema (e-mails); não filtra por pessoa.
 */
export async function listRunningObjectives(
  scope: { sectorId?: string },
  now: Date = new Date()
): Promise<ObjectiveRow[]> {
  return db.objective.findMany({
    where: {
      status: "ACTIVE",
      startsOn: { lte: now },
      endsOn: { gte: now },
      OR: [{ scope: "AGENCY" }, ...(scope.sectorId ? [{ scope: "SECTOR" as const, sectorId: scope.sectorId }] : [])],
    },
    include: includeAll,
    orderBy: [{ scope: "asc" }, { createdAt: "asc" }],
  });
}

function scopeOf(o: Pick<Objective, "scope" | "sectorId" | "userId">): SummaryScope {
  if (o.scope === "SECTOR") return { sectorId: o.sectorId ?? undefined };
  if (o.scope === "USER") return { userId: o.userId ?? undefined };
  return {};
}

/** Valor atual dos resultados-chave KPI e progresso/confiança de tudo. */
/** Quem olha: define só se o botão de check-in aparece. */
export type ObjectiveViewer = { id: string; canManage: boolean };

export function objectiveViewer(user: SessionUser): ObjectiveViewer {
  return { id: user.id, canManage: canManage(user) };
}

export async function evaluateObjectives(
  rows: ObjectiveRow[],
  viewer: ObjectiveViewer,
  now: Date = new Date()
): Promise<ObjectiveView[]> {
  const manage = viewer.canManage;
  const evaluated = rows.slice(0, MAX_EVALUATED_OBJECTIVES);
  const summaries = new Map<string, Promise<Awaited<ReturnType<typeof getPerformanceSummary>>>>();

  return Promise.all(
    evaluated.map(async (o): Promise<ObjectiveView> => {
      const expected = expectedProgress(o, now);
      const started = now >= o.startsOn;
      const to = o.endsOn < now ? o.endsOn : now;
      const key = `${o.scope}|${o.sectorId}|${o.userId}|${o.startsOn.getTime()}|${to.getTime()}`;

      const needsKpi = started && o.keyResults.some((kr) => kr.kind === "KPI");
      let summary: Awaited<ReturnType<typeof getPerformanceSummary>> | null = null;
      if (needsKpi) {
        let pending = summaries.get(key);
        if (!pending) {
          pending = getPerformanceSummary({ scope: scopeOf(o), range: { from: o.startsOn, to }, now });
          summaries.set(key, pending);
        }
        summary = await pending;
      }

      const keyResults = o.keyResults.map((kr): KeyResultView => {
        const current =
          kr.kind === "KPI"
            ? summary && kr.metric
              ? summary.indicators[kr.metric as KpiKey].value
              : null
            : kr.currentValue;
        const progress = keyResultProgress(kr.startValue, kr.targetValue, current);
        const history = kr.checkIns.map(
          (c): CheckInView => ({
            id: c.id,
            value: c.value,
            confidence: c.confidence as Confidence,
            note: c.note,
            authorName: c.author.name,
            createdAt: c.createdAt.toISOString(),
          })
        );
        return {
          id: kr.id,
          title: kr.title,
          kind: kr.kind,
          metric: (kr.metric as KpiKey | null) ?? null,
          unit: kr.unit,
          startValue: kr.startValue,
          targetValue: kr.targetValue,
          current,
          progress,
          confidence: keyResultConfidence({
            kind: kr.kind,
            progress,
            expected,
            lastCheckIn: history[0]?.confidence ?? null,
          }),
          history,
        };
      });

      return {
        id: o.id,
        title: o.title,
        description: o.description,
        ownerId: o.ownerId,
        ownerName: o.owner.name,
        scope: o.scope,
        sectorId: o.sectorId,
        sectorName: o.sector?.name ?? null,
        userId: o.userId,
        userName: o.user?.name ?? null,
        parentId: o.parentId,
        startsOn: o.startsOn.toISOString(),
        endsOn: o.endsOn.toISOString(),
        status: o.status as ObjectiveStatus,
        progress: objectiveProgress(keyResults.map((k) => k.progress)),
        confidence: worstConfidence(keyResults.map((k) => k.confidence)),
        canCheckIn: manage || o.ownerId === viewer.id,
        keyResults,
      };
    })
  );
}

// ------------------------------------------------------------------ escrita
async function assertActiveInternalUser(id: string, label: string) {
  const person = await db.user.findUnique({
    where: { id },
    select: { status: true, userType: true },
  });
  if (!person || person.status !== UserStatus.ACTIVE || person.userType === UserType.EXTERNAL_CLIENT) {
    throw new Error(`${label} não encontrado.`);
  }
}

async function assertValidObjective(draft: ObjectiveDraft, selfId?: string) {
  await assertActiveInternalUser(draft.ownerId, "Dono");
  if (draft.sectorId) {
    const sector = await db.sector.findUnique({ where: { id: draft.sectorId }, select: { isActive: true } });
    if (!sector?.isActive) throw new Error("Setor não encontrado.");
  }
  if (draft.userId) await assertActiveInternalUser(draft.userId, "Pessoa");
  if (draft.parentId) {
    if (draft.parentId === selfId) throw new Error("Um objetivo não pode ser pai dele mesmo.");
    const parent = await db.objective.findUnique({ where: { id: draft.parentId }, select: { scope: true } });
    if (!parent) throw new Error("Objetivo-pai não encontrado.");
    if (!canBeParent(parent.scope, draft.scope)) {
      throw new Error("O objetivo-pai precisa ter um escopo mais amplo (agência, depois setor, depois pessoa).");
    }
  }
}

function snapshot(o: Objective): Prisma.InputJsonValue {
  return {
    title: o.title,
    ownerId: o.ownerId,
    scope: o.scope,
    sectorId: o.sectorId,
    userId: o.userId,
    parentId: o.parentId,
    startsOn: o.startsOn.toISOString(),
    endsOn: o.endsOn.toISOString(),
    status: o.status,
  };
}

function parseObjective(input: ObjectiveInput): ObjectiveDraft {
  const parsed = parseObjectiveInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

export async function createObjective(user: SessionUser, input: ObjectiveInput) {
  assertCanManage(user);
  const draft = parseObjective(input);
  await assertValidObjective(draft);
  const objective = await db.objective.create({ data: { ...draft, createdById: user.id } });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_CREATED",
    entityType: "Objective",
    entityId: objective.id,
    newValue: snapshot(objective),
  });
  return objective;
}

export async function updateObjective(user: SessionUser, id: string, input: ObjectiveInput) {
  assertCanManage(user);
  const existing = await db.objective.findUnique({ where: { id } });
  if (!existing) throw new Error("Objetivo não encontrado.");
  const draft = parseObjective(input);
  await assertValidObjective(draft, id);
  const objective = await db.objective.update({ where: { id }, data: draft });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_UPDATED",
    entityType: "Objective",
    entityId: id,
    previousValue: snapshot(existing),
    newValue: snapshot(objective),
  });
  return objective;
}

export async function setObjectiveStatus(user: SessionUser, id: string, status: ObjectiveStatus) {
  assertCanManage(user);
  const existing = await db.objective.findUnique({ where: { id } });
  if (!existing) throw new Error("Objetivo não encontrado.");
  if (existing.status === status) return existing;
  const objective = await db.objective.update({
    where: { id },
    data: { status: status as DbObjectiveStatus },
  });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_UPDATED",
    entityType: "Objective",
    entityId: id,
    previousValue: snapshot(existing),
    newValue: snapshot(objective),
  });
  return objective;
}

export async function deleteObjective(user: SessionUser, id: string) {
  assertCanManage(user);
  const existing = await db.objective.findUnique({ where: { id } });
  if (!existing) throw new Error("Objetivo não encontrado.");
  await db.objective.delete({ where: { id } });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_DELETED",
    entityType: "Objective",
    entityId: id,
    previousValue: snapshot(existing),
  });
}

/** Copia o objetivo e os resultados-chave para o próximo período, sem valores atuais. */
export async function duplicateObjective(user: SessionUser, id: string) {
  assertCanManage(user);
  const source = await db.objective.findUnique({ where: { id }, include: { keyResults: true } });
  if (!source) throw new Error("Objetivo não encontrado.");
  const period = nextPeriod(source);
  const copy = await db.objective.create({
    data: {
      title: source.title,
      description: source.description,
      ownerId: source.ownerId,
      scope: source.scope,
      sectorId: source.sectorId,
      userId: source.userId,
      parentId: source.parentId,
      startsOn: period.startsOn,
      endsOn: period.endsOn,
      createdById: user.id,
      keyResults: {
        create: source.keyResults.map((kr) => ({
          title: kr.title,
          kind: kr.kind,
          metric: kr.metric,
          unit: kr.unit,
          startValue: kr.startValue,
          targetValue: kr.targetValue,
          sortOrder: kr.sortOrder,
        })),
      },
    },
  });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_CREATED",
    entityType: "Objective",
    entityId: copy.id,
    newValue: { ...(snapshot(copy) as object), duplicatedFrom: id },
  });
  return copy;
}

// ------------------------------------------------------------ resultados-chave
function parseKr(input: KeyResultInput) {
  const parsed = parseKeyResultInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

export async function addKeyResult(user: SessionUser, objectiveId: string, input: KeyResultInput) {
  assertCanManage(user);
  const objective = await db.objective.findUnique({
    where: { id: objectiveId },
    select: { id: true, _count: { select: { keyResults: true } } },
  });
  if (!objective) throw new Error("Objetivo não encontrado.");
  if (objective._count.keyResults >= MAX_KEY_RESULTS) {
    throw new Error(`Um objetivo pode ter no máximo ${MAX_KEY_RESULTS} resultados-chave.`);
  }
  const draft = parseKr(input);
  const kr = await db.keyResult.create({
    data: { ...draft, objectiveId, sortOrder: objective._count.keyResults },
  });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_UPDATED",
    entityType: "Objective",
    entityId: objectiveId,
    newValue: { keyResultAdded: kr.id, title: kr.title },
  });
  return kr;
}

export async function updateKeyResult(user: SessionUser, id: string, input: KeyResultInput) {
  assertCanManage(user);
  const existing = await db.keyResult.findUnique({ where: { id } });
  if (!existing) throw new Error("Resultado-chave não encontrado.");
  const draft = parseKr(input);
  // Trocar o tipo apagaria o sentido do valor atual: só o título e os valores mudam.
  if (draft.kind !== existing.kind) {
    throw new Error("Não dá para trocar o tipo do resultado-chave. Crie um novo.");
  }
  const kr = await db.keyResult.update({ where: { id }, data: draft });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_UPDATED",
    entityType: "Objective",
    entityId: existing.objectiveId,
    newValue: { keyResultUpdated: id },
  });
  return kr;
}

export async function deleteKeyResult(user: SessionUser, id: string) {
  assertCanManage(user);
  const existing = await db.keyResult.findUnique({ where: { id } });
  if (!existing) throw new Error("Resultado-chave não encontrado.");
  await db.keyResult.delete({ where: { id } });
  await logAudit({
    userId: user.id,
    action: "OBJECTIVE_UPDATED",
    entityType: "Objective",
    entityId: existing.objectiveId,
    newValue: { keyResultDeleted: id, title: existing.title },
  });
}

/** Check-in de resultado-chave manual: dono do objetivo ou quem gerencia. */
export async function addCheckIn(user: SessionUser, keyResultId: string, input: CheckInInput) {
  if (user.userType === UserType.EXTERNAL_CLIENT) {
    throw new Error("Você não tem permissão para registrar check-in.");
  }
  const kr = await db.keyResult.findUnique({
    where: { id: keyResultId },
    include: { objective: { select: { id: true, ownerId: true, status: true } } },
  });
  if (!kr) throw new Error("Resultado-chave não encontrado.");
  if (!canManage(user) && kr.objective.ownerId !== user.id) {
    throw new Error("Só o dono do objetivo ou a gestão registra check-in.");
  }
  if (kr.kind !== "MANUAL") throw new Error("Este resultado é calculado pelo sistema e não aceita check-in.");
  if (kr.objective.status !== "ACTIVE") throw new Error("O objetivo não está em andamento.");

  const parsed = parseCheckInInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const { value, confidence, note } = parsed.value;

  const [checkIn] = await db.$transaction([
    db.keyResultCheckIn.create({
      data: { keyResultId, authorId: user.id, value, confidence: confidence as DbConfidence, note },
    }),
    db.keyResult.update({ where: { id: keyResultId }, data: { currentValue: value } }),
  ]);
  await logAudit({
    userId: user.id,
    action: "KEY_RESULT_CHECKED_IN",
    entityType: "KeyResult",
    entityId: keyResultId,
    newValue: { value, confidence, objectiveId: kr.objective.id },
  });
  return checkIn;
}

