import { formatKpiValue } from "@/lib/agency/performance-format";
import { KPI_CATALOG, KPI_KEYS, type KpiKey } from "@/lib/agency/performance-summary";
import { dayKey, endOfDayMs, isValidDayKey, startOfDayMs } from "@/lib/agency/sp-calendar";

export const GOAL_SCOPES = ["AGENCY", "SECTOR", "USER"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

export const GOAL_SCOPE_LABEL: Record<GoalScope, string> = {
  AGENCY: "Agência",
  SECTOR: "Setor",
  USER: "Pessoa",
};

export const DEFAULT_WARN_MARGIN = 0.1;

/** Entrada do formulário: `target` na unidade do indicador, datas `AAAA-MM-DD`. */
export type GoalInput = {
  metric: string;
  scope: string;
  sectorId?: string | null;
  userId?: string | null;
  target: number;
  warnMargin?: number | null;
  startsOn: string;
  endsOn: string;
  note?: string | null;
};

export type GoalDraft = {
  metric: KpiKey;
  scope: GoalScope;
  sectorId: string | null;
  userId: string | null;
  target: number;
  warnMargin: number;
  startsOn: Date;
  endsOn: Date;
  note: string | null;
};

export function parseGoalInput(
  input: GoalInput
): { ok: true; value: GoalDraft } | { ok: false; error: string } {
  if (!KPI_KEYS.includes(input.metric as KpiKey)) {
    return { ok: false, error: "Escolha o indicador da meta." };
  }
  const metric = input.metric as KpiKey;

  if (!GOAL_SCOPES.includes(input.scope as GoalScope)) {
    return { ok: false, error: "Escolha para quem é a meta." };
  }
  const scope = input.scope as GoalScope;
  const sectorId = input.sectorId?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (scope === "SECTOR" && !sectorId) return { ok: false, error: "Escolha o setor." };
  if (scope === "USER" && !userId) return { ok: false, error: "Escolha a pessoa." };

  if (!Number.isFinite(input.target) || input.target < 0) {
    return { ok: false, error: "O valor da meta precisa ser um número maior ou igual a zero." };
  }
  if (KPI_CATALOG[metric].unit === "percent" && input.target > 1) {
    return { ok: false, error: "A meta em porcentagem vai de 0% a 100%." };
  }

  const warnMargin = input.warnMargin ?? DEFAULT_WARN_MARGIN;
  if (!Number.isFinite(warnMargin) || warnMargin < 0 || warnMargin > 1) {
    return { ok: false, error: "A margem de alerta vai de 0% a 100%." };
  }

  if (!isValidDayKey(input.startsOn) || !isValidDayKey(input.endsOn)) {
    return { ok: false, error: "Informe o período da meta." };
  }
  if (input.endsOn < input.startsOn) {
    return { ok: false, error: "O fim do período precisa ser depois do início." };
  }

  const note = input.note?.trim() || null;
  if (note && note.length > 200) {
    return { ok: false, error: "A observação pode ter no máximo 200 caracteres." };
  }

  return {
    ok: true,
    value: {
      metric,
      scope,
      sectorId: scope === "SECTOR" ? sectorId : null,
      userId: scope === "USER" ? userId : null,
      target: input.target,
      warnMargin,
      startsOn: new Date(startOfDayMs(input.startsOn)),
      endsOn: new Date(endOfDayMs(input.endsOn)),
      note,
    },
  };
}

export type GoalStatus = "met" | "near" | "off" | "none";

export type GoalEvaluation = { status: GoalStatus; progress: number | null };

/**
 * Semáforo. Maior é melhor: atingiu = verde; até `warnMargin` abaixo do alvo
 * = amarelo; além = vermelho. Menor é melhor: espelhado. Sem leitura = none.
 */
export function evaluateGoal(
  metric: KpiKey,
  target: number,
  warnMargin: number,
  actual: number | null
): GoalEvaluation {
  if (actual === null) return { status: "none", progress: null };
  if (KPI_CATALOG[metric].direction === "higher") {
    const progress = target === 0 ? 1 : Math.min(1, Math.max(0, actual / target));
    if (actual >= target) return { status: "met", progress };
    return { status: actual >= target * (1 - warnMargin) ? "near" : "off", progress };
  }
  const progress = actual <= target ? 1 : target === 0 ? 0 : Math.max(0, target / actual);
  if (actual <= target) return { status: "met", progress };
  return { status: actual <= target * (1 + warnMargin) ? "near" : "off", progress };
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  met: "Meta atingida",
  near: "Perto da meta",
  off: "Abaixo da meta",
  none: "Sem leitura",
};

/** "≥ 85%" ou "≤ 5", conforme a direção do indicador. */
export function describeTarget(metric: KpiKey, target: number): string {
  const meta = KPI_CATALOG[metric];
  return `${meta.direction === "higher" ? "≥" : "≤"} ${formatKpiValue(target, meta.unit)}`;
}

export type GoalPeriodState = "upcoming" | "running" | "ended";

export function goalPeriodState(
  goal: { startsOn: Date; endsOn: Date },
  now: Date
): GoalPeriodState {
  if (now < goal.startsOn) return "upcoming";
  if (now > goal.endsOn) return "ended";
  return "running";
}

export type GoalViewer = {
  id: string;
  sectorId: string | null;
  canManage: boolean;
};

/** Quem gerencia vê tudo; os demais, agência, o próprio setor e as próprias. */
export function canViewGoal(
  goal: { scope: string; sectorId: string | null; userId: string | null },
  viewer: GoalViewer
): boolean {
  if (viewer.canManage || goal.scope === "AGENCY") return true;
  if (goal.scope === "SECTOR") return goal.sectorId !== null && goal.sectorId === viewer.sectorId;
  return goal.userId === viewer.id;
}

export function periodsOverlap(
  a: { startsOn: Date; endsOn: Date },
  b: { startsOn: Date; endsOn: Date }
): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

export type PeriodPreset = "month" | "quarter";

/** Mês ou trimestre (inteiros) em que `now` cai, como `AAAA-MM-DD`. */
export function presetPeriod(
  preset: PeriodPreset,
  now: Date = new Date()
): { startsOn: string; endsOn: string } {
  const today = dayKey(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const firstMonth = preset === "month" ? month : Math.floor((month - 1) / 3) * 3 + 1;
  const lastMonth = preset === "month" ? month : firstMonth + 2;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  return {
    startsOn: `${year}-${pad(firstMonth)}-01`,
    endsOn: `${year}-${pad(lastMonth)}-${pad(lastDay)}`,
  };
}

/** Texto ao lado do campo de valor: "%", "h", "dias" ou "demandas". */
export function metricUnitSuffix(metric: KpiKey): string {
  const unit = KPI_CATALOG[metric].unit;
  if (unit === "percent") return "%";
  if (unit === "hours") return "h";
  if (unit === "days") return "dias";
  return "demandas";
}
