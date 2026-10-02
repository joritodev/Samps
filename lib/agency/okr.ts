import { GOAL_SCOPES, type GoalScope } from "@/lib/agency/goals";
import { KPI_CATALOG, KPI_KEYS, type KpiKey } from "@/lib/agency/performance-summary";
import { dayKey, endOfDayMs, isValidDayKey, startOfDayMs } from "@/lib/agency/sp-calendar";

export type Confidence = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
export const CONFIDENCES: Confidence[] = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  ON_TRACK: "No caminho",
  AT_RISK: "Em risco",
  OFF_TRACK: "Fora do caminho",
};

export type ObjectiveStatus = "ACTIVE" | "DONE" | "CANCELLED";

export const OBJECTIVE_STATUS_LABEL: Record<ObjectiveStatus, string> = {
  ACTIVE: "Em andamento",
  DONE: "Concluído",
  CANCELLED: "Cancelado",
};

/** Pontos de atraso sobre o ritmo esperado: até 10 = no caminho, até 25 = em risco. */
export const AT_RISK_GAP = 0.1;
export const OFF_TRACK_GAP = 0.25;

const SCOPE_RANK: Record<GoalScope, number> = { AGENCY: 0, SECTOR: 1, USER: 2 };

// ---------------------------------------------------------------- progresso
/**
 * `(atual − inicial) / (alvo − inicial)`, limitado a 0–1. Vale para subir
 * (alvo > inicial) e para descer (alvo < inicial). Sem valor atual: sem leitura.
 */
export function keyResultProgress(
  start: number,
  target: number,
  current: number | null
): number | null {
  if (current === null || target === start) return null;
  return Math.min(1, Math.max(0, (current - start) / (target - start)));
}

export function objectiveProgress(progresses: (number | null)[]): number | null {
  const known = progresses.filter((p): p is number => p !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, p) => sum + p, 0) / known.length;
}

/** Fração do período já decorrida (0–1). */
export function expectedProgress(
  period: { startsOn: Date; endsOn: Date },
  now: Date
): number {
  const total = period.endsOn.getTime() - period.startsOn.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - period.startsOn.getTime()) / total));
}

/** Confiança calculada pelo ritmo; progresso completo é sempre no caminho. */
export function computedConfidence(progress: number | null, expected: number): Confidence | null {
  if (progress === null) return null;
  if (progress >= 1) return "ON_TRACK";
  const gap = expected - progress;
  if (gap <= AT_RISK_GAP) return "ON_TRACK";
  return gap <= OFF_TRACK_GAP ? "AT_RISK" : "OFF_TRACK";
}

/** Check-in manual vale mais que o cálculo; sem check-in, o cálculo. */
export function keyResultConfidence(params: {
  kind: "KPI" | "MANUAL";
  progress: number | null;
  expected: number;
  lastCheckIn: Confidence | null;
}): Confidence | null {
  if (params.kind === "MANUAL" && params.lastCheckIn) return params.lastCheckIn;
  return computedConfidence(params.progress, params.expected);
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { ON_TRACK: 0, AT_RISK: 1, OFF_TRACK: 2 };

/** Do objetivo: a pior confiança entre os resultados-chave com leitura. */
export function worstConfidence(list: (Confidence | null)[]): Confidence | null {
  let worst: Confidence | null = null;
  for (const c of list) {
    if (c && (worst === null || CONFIDENCE_ORDER[c] > CONFIDENCE_ORDER[worst])) worst = c;
  }
  return worst;
}

// ----------------------------------------------------------------- cascata
/** O pai precisa ter escopo mais amplo; isso também impede ciclos. */
export function canBeParent(parentScope: GoalScope, childScope: GoalScope): boolean {
  return SCOPE_RANK[parentScope] < SCOPE_RANK[childScope];
}

export function canViewObjective(
  objective: { scope: string; sectorId: string | null; userId: string | null; ownerId: string },
  viewer: { id: string; sectorId: string | null; canManage: boolean }
): boolean {
  if (viewer.canManage || objective.scope === "AGENCY" || objective.ownerId === viewer.id) return true;
  if (objective.scope === "SECTOR") {
    return objective.sectorId !== null && objective.sectorId === viewer.sectorId;
  }
  return objective.userId === viewer.id;
}

// -------------------------------------------------------------- validação
export type ObjectiveInput = {
  title: string;
  description?: string | null;
  ownerId: string;
  scope: string;
  sectorId?: string | null;
  userId?: string | null;
  parentId?: string | null;
  startsOn: string;
  endsOn: string;
};

export type ObjectiveDraft = {
  title: string;
  description: string | null;
  ownerId: string;
  scope: GoalScope;
  sectorId: string | null;
  userId: string | null;
  parentId: string | null;
  startsOn: Date;
  endsOn: Date;
};

export function parseObjectiveInput(
  input: ObjectiveInput
): { ok: true; value: ObjectiveDraft } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Dê um título ao objetivo." };
  if (title.length > 140) return { ok: false, error: "O título pode ter no máximo 140 caracteres." };

  const description = input.description?.trim() || null;
  if (description && description.length > 600) {
    return { ok: false, error: "A descrição pode ter no máximo 600 caracteres." };
  }

  if (!input.ownerId?.trim()) return { ok: false, error: "Escolha quem é o dono do objetivo." };

  if (!GOAL_SCOPES.includes(input.scope as GoalScope)) {
    return { ok: false, error: "Escolha para quem é o objetivo." };
  }
  const scope = input.scope as GoalScope;
  const sectorId = input.sectorId?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (scope === "SECTOR" && !sectorId) return { ok: false, error: "Escolha o setor." };
  if (scope === "USER" && !userId) return { ok: false, error: "Escolha a pessoa." };

  if (!isValidDayKey(input.startsOn) || !isValidDayKey(input.endsOn)) {
    return { ok: false, error: "Informe o período do objetivo." };
  }
  if (input.endsOn < input.startsOn) {
    return { ok: false, error: "O fim do período precisa ser depois do início." };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      ownerId: input.ownerId.trim(),
      scope,
      sectorId: scope === "SECTOR" ? sectorId : null,
      userId: scope === "USER" ? userId : null,
      parentId: input.parentId?.trim() || null,
      startsOn: new Date(startOfDayMs(input.startsOn)),
      endsOn: new Date(endOfDayMs(input.endsOn)),
    },
  };
}

export type KeyResultInput = {
  title: string;
  kind: string;
  metric?: string | null;
  unit?: string | null;
  startValue: number;
  targetValue: number;
};

export type KeyResultDraft = {
  title: string;
  kind: "KPI" | "MANUAL";
  metric: KpiKey | null;
  unit: string | null;
  startValue: number;
  targetValue: number;
};

export function parseKeyResultInput(
  input: KeyResultInput
): { ok: true; value: KeyResultDraft } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Dê um título ao resultado-chave." };
  if (title.length > 140) return { ok: false, error: "O título pode ter no máximo 140 caracteres." };

  if (input.kind !== "KPI" && input.kind !== "MANUAL") {
    return { ok: false, error: "Escolha se o resultado é automático ou manual." };
  }

  let metric: KpiKey | null = null;
  if (input.kind === "KPI") {
    if (!KPI_KEYS.includes(input.metric as KpiKey)) {
      return { ok: false, error: "Escolha o indicador do resultado-chave." };
    }
    metric = input.metric as KpiKey;
  }

  if (!Number.isFinite(input.startValue) || !Number.isFinite(input.targetValue)) {
    return { ok: false, error: "Informe o valor inicial e o alvo." };
  }
  if (input.startValue === input.targetValue) {
    return { ok: false, error: "O alvo precisa ser diferente do valor inicial." };
  }
  if (metric && KPI_CATALOG[metric].unit === "percent") {
    for (const v of [input.startValue, input.targetValue]) {
      if (v < 0 || v > 1) return { ok: false, error: "Valores em porcentagem vão de 0% a 100%." };
    }
  }
  if (input.startValue < 0 || input.targetValue < 0) {
    return { ok: false, error: "Os valores não podem ser negativos." };
  }

  const unit = input.kind === "MANUAL" ? input.unit?.trim() || null : null;
  if (unit && unit.length > 24) return { ok: false, error: "A unidade pode ter no máximo 24 caracteres." };

  return {
    ok: true,
    value: {
      title,
      kind: input.kind,
      metric,
      unit,
      startValue: input.startValue,
      targetValue: input.targetValue,
    },
  };
}

export type CheckInInput = {
  value: number;
  confidence: string;
  note?: string | null;
};

export function parseCheckInInput(
  input: CheckInInput
): { ok: true; value: { value: number; confidence: Confidence; note: string | null } } | { ok: false; error: string } {
  if (!Number.isFinite(input.value) || input.value < 0) {
    return { ok: false, error: "Informe o valor atual." };
  }
  if (!CONFIDENCES.includes(input.confidence as Confidence)) {
    return { ok: false, error: "Escolha como está o andamento." };
  }
  const note = input.note?.trim() || null;
  if (note && note.length > 300) return { ok: false, error: "A nota pode ter no máximo 300 caracteres." };
  return { ok: true, value: { value: input.value, confidence: input.confidence as Confidence, note } };
}

/**
 * Próximo período: mês inteiro vira o mês seguinte, trimestre inteiro vira o
 * trimestre seguinte; qualquer outro intervalo anda para logo depois, com o
 * mesmo tamanho em dias.
 */
export function nextPeriod(period: { startsOn: Date; endsOn: Date }): { startsOn: Date; endsOn: Date } {
  const from = dayKey(period.startsOn);
  const to = dayKey(period.endsOn);
  const fromMonth = Number(from.slice(5, 7));
  const toMonth = Number(to.slice(5, 7));
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + toMonth - fromMonth + 1;
  const lastDay = new Date(Date.UTC(Number(to.slice(0, 4)), toMonth, 0)).getUTCDate();
  const wholeMonths = from.endsWith("-01") && Number(to.slice(8, 10)) === lastDay;
  const alignedQuarter = months === 3 && (fromMonth - 1) % 3 === 0;

  if (wholeMonths && (months === 1 || alignedQuarter)) {
    const nextFrom = new Date(Date.UTC(Number(from.slice(0, 4)), fromMonth - 1 + months, 1));
    const nextTo = new Date(Date.UTC(nextFrom.getUTCFullYear(), nextFrom.getUTCMonth() + months, 0));
    const key = (d: Date) => d.toISOString().slice(0, 10);
    return {
      startsOn: new Date(startOfDayMs(key(nextFrom))),
      endsOn: new Date(endOfDayMs(key(nextTo))),
    };
  }

  const length = period.endsOn.getTime() - period.startsOn.getTime() + 1;
  return {
    startsOn: new Date(period.startsOn.getTime() + length),
    endsOn: new Date(period.endsOn.getTime() + length),
  };
}

/** Dias sem check-in a partir dos quais o resultado-chave manual fica pendente. */
export const STALE_CHECKIN_DAYS = 7;

export type StaleCheckIn = {
  objectiveId: string;
  objectiveTitle: string;
  ownerId: string;
  ownerName: string;
  keyResultId: string;
  keyResultTitle: string;
  /** Dias desde o último check-in; null quando nunca houve. */
  daysSince: number | null;
};

type CheckInSource = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  startsOn: Date;
  keyResults: { id: string; title: string; kind: string; lastCheckInAt: Date | null }[];
};

/**
 * Resultados-chave manuais de objetivos em andamento sem check-in há
 * `STALE_CHECKIN_DAYS` dias ou mais. Sem nenhum check-in, vale a idade do
 * objetivo (objetivo recém-criado não cobra ninguém).
 */
export function findStaleCheckIns(
  objectives: CheckInSource[],
  now: Date,
  days: number = STALE_CHECKIN_DAYS
): StaleCheckIn[] {
  const limit = days * 24 * 60 * 60 * 1000;
  const out: StaleCheckIn[] = [];
  for (const o of objectives) {
    for (const kr of o.keyResults) {
      if (kr.kind !== "MANUAL") continue;
      const since = kr.lastCheckInAt ?? o.startsOn;
      const elapsed = now.getTime() - since.getTime();
      if (elapsed < limit) continue;
      out.push({
        objectiveId: o.id,
        objectiveTitle: o.title,
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        keyResultId: kr.id,
        keyResultTitle: kr.title,
        daysSince: kr.lastCheckInAt ? Math.floor(elapsed / (24 * 60 * 60 * 1000)) : null,
      });
    }
  }
  return out;
}
