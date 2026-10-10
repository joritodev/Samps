import type { ProjectStatus } from "@prisma/client";
import { parseDateKey } from "./dates";

/** Demanda que conta como entregue para o progresso do projeto. */
const CLOSED = new Set(["DONE", "PUBLISHED", "DELIVERED"]);

export function isDemandClosed(status: string): boolean {
  return CLOSED.has(status);
}

export type ProjectProgress = { total: number; done: number; open: number; percent: number };

/** Canceladas não entram na conta: o projeto fecha quando todo o resto está entregue. */
export function projectProgress(statuses: readonly string[]): ProjectProgress {
  const counted = statuses.filter((s) => s !== "CANCELLED");
  const done = counted.filter(isDemandClosed).length;
  const total = counted.length;
  return {
    total,
    done,
    open: total - done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

const TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ACTIVE", "CANCELLED"],
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["PLANNING"],
};

export function allowedProjectTransitions(from: ProjectStatus): readonly ProjectStatus[] {
  return TRANSITIONS[from];
}

/** Devolve a mensagem de recusa ou `null` se a mudança de status pode seguir. */
export function projectTransitionError(
  from: ProjectStatus,
  to: ProjectStatus,
  progress: ProjectProgress
): string | null {
  if (from === to) return "O projeto já está nesse status.";
  if (!TRANSITIONS[from].includes(to)) return "Mudança de status não permitida para este projeto.";
  if (to === "COMPLETED" && progress.open > 0) {
    return `Ainda há ${progress.open} ${progress.open === 1 ? "demanda aberta" : "demandas abertas"} neste projeto.`;
  }
  return null;
}

export type ProjectSuggestion = {
  next: ProjectStatus;
  /** `true` aplica sozinho (Planejamento para Em andamento); o resto pede confirmação da gestão. */
  auto: boolean;
  reason: string;
};

export function suggestProjectStatus(input: {
  status: ProjectStatus;
  progress: ProjectProgress;
  startDate: Date | null;
  now: Date;
}): ProjectSuggestion | null {
  const { status, progress, startDate, now } = input;
  if (status === "PLANNING") {
    if (progress.total > 0) {
      return { next: "ACTIVE", auto: true, reason: "Já há demandas ligadas ao projeto." };
    }
    if (startDate && startDate.getTime() <= now.getTime()) {
      return { next: "ACTIVE", auto: true, reason: "A data de início chegou." };
    }
    return null;
  }
  if (status === "ACTIVE" && progress.total > 0 && progress.open === 0) {
    return {
      next: "COMPLETED",
      auto: false,
      reason: "Todas as demandas foram entregues. Confirme para concluir o projeto.",
    };
  }
  return null;
}

export type ProjectInput = {
  clientId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  outsideContract: boolean;
  participantIds: string[];
};

export type ParsedProject = { ok: true; value: ProjectInput } | { ok: false; error: string };

export function parseProjectInput(raw: Record<string, unknown>): ParsedProject {
  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  if (!clientId) return { ok: false, error: "Selecione o cliente." };

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length < 3) return { ok: false, error: "Dê um título ao projeto (mínimo 3 letras)." };
  if (title.length > 120) return { ok: false, error: "Título muito longo (máximo 120)." };

  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > 4000) return { ok: false, error: "Descrição muito longa." };

  const start = parseDateKey(typeof raw.startDate === "string" ? raw.startDate : null);
  const due = parseDateKey(typeof raw.dueDate === "string" ? raw.dueDate : null);
  if (start === "invalid") return { ok: false, error: "Data de início inválida." };
  if (due === "invalid") return { ok: false, error: "Prazo inválido." };
  if (start && due && due.getTime() < start.getTime()) {
    return { ok: false, error: "O prazo não pode ser antes do início." };
  }

  const ownerId = typeof raw.ownerId === "string" && raw.ownerId.trim() ? raw.ownerId.trim() : null;
  const participantIds = Array.isArray(raw.participantIds)
    ? Array.from(
        new Set(
          raw.participantIds.filter((v): v is string => typeof v === "string" && v.trim() !== "")
        )
      ).slice(0, 30)
    : [];

  return {
    ok: true,
    value: {
      clientId,
      title,
      description: description || null,
      ownerId,
      startDate: start,
      dueDate: due,
      outsideContract: raw.outsideContract === true,
      participantIds,
    },
  };
}
