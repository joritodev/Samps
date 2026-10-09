import { isValidDayKey } from "@/lib/agency/sp-calendar";
import { PLAN_SECTOR_CONFIG } from "./config";
import type { PlanCardStatus, PlanSectorSlug } from "./types";

export const MAX_TITLE = 120;
export const MAX_NOTES = 500;
export const MAX_CLIENT_NAME = 80;
export const MAX_HOURS = 24;
export const MIN_HOURS = 1 / 60;

const STATUS_VALUES: PlanCardStatus[] = [
  "NAO_ALOCADO",
  "PROGRAMADO",
  "EM_EDICAO",
  "REVISAO",
  "CONCLUIDO",
];

/** Entrada da tela. Tudo é revalidado no servidor; o setor vem da rota, nunca daqui. */
export type PlanCardInput = {
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  status?: string;
  weekday?: number | null;
  memberId?: string | null;
  clientId?: string | null;
  /** Texto livre; só vale quando não há `clientId`. */
  clientName?: string | null;
  demandId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  required?: boolean;
  /** "Fixo semanal": trava o card no dia e na pessoa e repete toda semana. */
  recurring?: boolean;
};

export type PlanCardDraftValue = {
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  status: PlanCardStatus;
  weekday: number | null;
  memberId: string | null;
  clientId: string | null;
  clientName: string | null;
  demandId: string | null;
  dueDate: string | null;
  notes: string | null;
  required: boolean;
  recurring: boolean;
  pinned: boolean;
};

type Parsed = { ok: true; value: PlanCardDraftValue } | { ok: false; error: string };

function optionalId(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

export function parsePlanCardInput(input: PlanCardInput, sector: PlanSectorSlug): Parsed {
  const config = PLAN_SECTOR_CONFIG[sector];

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Informe o nome do card." };
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `O nome do card aceita até ${MAX_TITLE} caracteres.` };
  }

  if (!config.kinds.some((k) => k.value === input.kind)) {
    return { ok: false, error: "Escolha o tipo do card." };
  }
  if (!config.categories.includes(input.category)) {
    return { ok: false, error: "Escolha a categoria do card." };
  }

  const hours = Number(input.durationHours);
  if (!Number.isFinite(hours) || hours < MIN_HOURS || hours > MAX_HOURS) {
    return { ok: false, error: "A duração precisa ficar entre 1 minuto e 24 horas." };
  }
  const durationHours = Math.round(hours * 10000) / 10000;

  let weekday: number | null = null;
  if (input.weekday !== null && input.weekday !== undefined) {
    if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 6) {
      return { ok: false, error: "Escolha um dia de segunda a sábado." };
    }
    weekday = input.weekday;
  }
  const memberId = optionalId(input.memberId);
  const recurring = Boolean(input.recurring);
  if (recurring && (!weekday || !memberId)) {
    return { ok: false, error: "Escolha o dia e o responsável do fixo semanal." };
  }

  const statusRaw = input.status ?? "PROGRAMADO";
  if (!STATUS_VALUES.includes(statusRaw as PlanCardStatus)) {
    return { ok: false, error: "Escolha o status do card." };
  }
  const allocated = Boolean(weekday && memberId);
  let status = statusRaw as PlanCardStatus;
  if (!allocated) status = "NAO_ALOCADO";
  else if (status === "NAO_ALOCADO") status = "PROGRAMADO";

  let dueDate: string | null = null;
  if (!recurring && input.dueDate) {
    if (!isValidDayKey(input.dueDate)) return { ok: false, error: "Data de entrega inválida." };
    dueDate = input.dueDate;
  }

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > MAX_NOTES) {
    return { ok: false, error: `A observação aceita até ${MAX_NOTES} caracteres.` };
  }

  const clientId = optionalId(input.clientId);
  const clientNameRaw = typeof input.clientName === "string" ? input.clientName.trim() : "";
  if (clientNameRaw.length > MAX_CLIENT_NAME) {
    return { ok: false, error: `O nome do cliente aceita até ${MAX_CLIENT_NAME} caracteres.` };
  }

  return {
    ok: true,
    value: {
      title,
      kind: input.kind,
      category: input.category,
      durationHours,
      status,
      weekday,
      memberId,
      clientId,
      clientName: clientId ? null : clientNameRaw || null,
      demandId: optionalId(input.demandId),
      dueDate,
      notes: notes || null,
      required: Boolean(input.required),
      recurring,
      pinned: recurring,
    },
  };
}

/** Mover card: destino é uma coluna (pessoa × dia) de uma semana, ou o backlog (`to = null`). */
export type PlanCardMoveInput = {
  cardId: string;
  to: { memberId: string; weekday: number; isoYear: number; isoWeek: number } | null;
  /** Ids do destino na ordem final (inclui o card movido). */
  orderedIds: string[];
  /** Ids que ficaram na origem, na ordem final (vazio se a origem era o mesmo destino). */
  fromOrderedIds: string[];
};

export function parseMoveInput(
  input: PlanCardMoveInput,
): { ok: true; value: PlanCardMoveInput } | { ok: false; error: string } {
  if (typeof input.cardId !== "string" || !input.cardId) {
    return { ok: false, error: "Card inválido." };
  }
  const ids = [...input.orderedIds, ...input.fromOrderedIds];
  if (
    ![...input.orderedIds, ...input.fromOrderedIds].every((id) => typeof id === "string" && id) ||
    new Set(ids).size !== ids.length ||
    ids.length > 200
  ) {
    return { ok: false, error: "Ordem dos cards inválida." };
  }
  if (!input.orderedIds.includes(input.cardId)) {
    return { ok: false, error: "A ordem do destino precisa incluir o card movido." };
  }
  if (input.to) {
    const { weekday, isoYear, isoWeek, memberId } = input.to;
    if (
      !memberId ||
      !Number.isInteger(weekday) ||
      weekday < 1 ||
      weekday > 6 ||
      !Number.isInteger(isoWeek) ||
      isoWeek < 1 ||
      isoWeek > 53 ||
      !Number.isInteger(isoYear) ||
      isoYear < 2020 ||
      isoYear > 2100
    ) {
      return { ok: false, error: "Destino inválido." };
    }
  }
  return { ok: true, value: input };
}

/** Cards fixos (travados) só mudam de lugar pela edição, nunca arrastando. */
export function canDragCard(card: { pinned: boolean; recurring: boolean }) {
  return !card.pinned && !card.recurring;
}

/** Status de um card depois de cair numa coluna ou voltar ao backlog. */
export function statusAfterMove(current: PlanCardStatus, allocated: boolean): PlanCardStatus {
  if (!allocated) return "NAO_ALOCADO";
  return current === "NAO_ALOCADO" ? "PROGRAMADO" : current;
}
