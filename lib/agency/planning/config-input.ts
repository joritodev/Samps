import { PLAN_SECTOR_CONFIG } from "./config";
import { MAX_HOURS } from "./card-input";
import type { PlanSectorSlug } from "./types";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_LABEL = 80;
export const MAX_REASON = 80;
export const MAX_WEEKLY_QUANTITY = 14;
export const MAX_TEMPLATES_PER_CLIENT = 30;

const HEX = /^#[0-9a-fA-F]{6}$/;

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Capacidade em horas por dia: 0 (dia sem produção) até 24. */
export function parseCapacityHours(raw: number): Result<number> {
  if (!Number.isFinite(raw) || raw < 0 || raw > MAX_HOURS) {
    return { ok: false, error: "A capacidade precisa ficar entre 0 e 24 horas." };
  }
  return { ok: true, value: round(raw) };
}

export type MemberSettingsInput = { id: string; color: string; defaultCapacityHours: number };

export function parseMemberSettings(input: MemberSettingsInput): Result<MemberSettingsInput> {
  if (!input.id) return { ok: false, error: "Profissional inválido." };
  if (!HEX.test(input.color)) return { ok: false, error: "Escolha uma cor válida." };
  const capacity = parseCapacityHours(input.defaultCapacityHours);
  if (!capacity.ok) return capacity;
  return {
    ok: true,
    value: { id: input.id, color: input.color.toLowerCase(), defaultCapacityHours: capacity.value },
  };
}

export type CapacityOverrideInput = {
  memberId: string;
  weekday: number;
  hours: number;
  /** Semana específica; nulo = vale para todas as semanas. */
  week: { year: number; week: number } | null;
};

export function parseCapacityOverride(input: CapacityOverrideInput): Result<CapacityOverrideInput> {
  if (!input.memberId) return { ok: false, error: "Profissional inválido." };
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 6) {
    return { ok: false, error: "Escolha um dia de segunda a sábado." };
  }
  const hours = parseCapacityHours(input.hours);
  if (!hours.ok) return hours;
  if (input.week) {
    const { year, week } = input.week;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(week) ||
      year < 2020 ||
      year > 2100 ||
      week < 1 ||
      week > 53
    ) {
      return { ok: false, error: "Semana inválida." };
    }
  }
  return { ok: true, value: { ...input, hours: hours.value } };
}

export type PresetInput = { label: string; hours: number };

export function parsePresetInput(input: PresetInput): Result<PresetInput> {
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (!label) return { ok: false, error: "Informe o nome do tipo de produção." };
  if (label.length > MAX_LABEL) {
    return { ok: false, error: `O nome aceita até ${MAX_LABEL} caracteres.` };
  }
  if (!Number.isFinite(input.hours) || input.hours <= 0 || input.hours > MAX_HOURS) {
    return { ok: false, error: "A duração precisa ficar entre 1 minuto e 24 horas." };
  }
  return { ok: true, value: { label, hours: round(input.hours, 4) } };
}

export type TemplateInput = {
  id?: string | null;
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  weeklyQuantity: number;
  preferredMemberId?: string | null;
  preferredWeekday?: number | null;
  required?: boolean;
};

export type TemplateValue = {
  id: string | null;
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  weeklyQuantity: number;
  preferredMemberId: string | null;
  preferredWeekday: number | null;
  required: boolean;
};

export function parseTemplateInput(
  input: TemplateInput,
  sector: PlanSectorSlug,
): Result<TemplateValue> {
  const config = PLAN_SECTOR_CONFIG[sector];
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Informe o nome da demanda fixa." };
  if (title.length > MAX_LABEL + 40) return { ok: false, error: "O nome da demanda é longo demais." };
  if (!config.kinds.some((k) => k.value === input.kind)) {
    return { ok: false, error: "Escolha o tipo da demanda fixa." };
  }
  if (!config.categories.includes(input.category)) {
    return { ok: false, error: "Escolha a categoria da demanda fixa." };
  }
  if (!Number.isFinite(input.durationHours) || input.durationHours <= 0 || input.durationHours > MAX_HOURS) {
    return { ok: false, error: "A duração precisa ficar entre 1 minuto e 24 horas." };
  }
  if (
    !Number.isInteger(input.weeklyQuantity) ||
    input.weeklyQuantity < 1 ||
    input.weeklyQuantity > MAX_WEEKLY_QUANTITY
  ) {
    return {
      ok: false,
      error: `A quantidade por semana precisa ficar entre 1 e ${MAX_WEEKLY_QUANTITY}.`,
    };
  }
  const weekday = input.preferredWeekday ?? null;
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 1 || weekday > 6)) {
    return { ok: false, error: "Escolha um dia de segunda a sábado." };
  }
  return {
    ok: true,
    value: {
      id: input.id?.trim() || null,
      title,
      kind: input.kind,
      category: input.category,
      durationHours: round(input.durationHours, 4),
      weeklyQuantity: input.weeklyQuantity,
      preferredMemberId: input.preferredMemberId?.trim() || null,
      preferredWeekday: weekday,
      required: Boolean(input.required),
    },
  };
}

export function parseTemplateList(
  inputs: TemplateInput[],
  sector: PlanSectorSlug,
): Result<TemplateValue[]> {
  if (!Array.isArray(inputs) || inputs.length > MAX_TEMPLATES_PER_CLIENT) {
    return { ok: false, error: `Cada cliente aceita até ${MAX_TEMPLATES_PER_CLIENT} demandas fixas.` };
  }
  const values: TemplateValue[] = [];
  for (const input of inputs) {
    const parsed = parseTemplateInput(input, sector);
    if (!parsed.ok) return parsed;
    values.push(parsed.value);
  }
  const ids = values.map((v) => v.id).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Demanda fixa repetida." };
  return { ok: true, value: values };
}

/** Texto padrão do bloqueio, como no painel original. */
export function blockReason(memberId: string | null) {
  return memberId ? "Indisponível" : "Feriado / dia bloqueado";
}
