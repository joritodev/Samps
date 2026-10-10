import type { ShootStatus } from "@prisma/client";
import { INVALID_URL_MESSAGE, isHttpUrl } from "@/lib/agency/url";
import { addBusinessDays, parseDateKey } from "./dates";

const TRANSITIONS: Record<ShootStatus, readonly ShootStatus[]> = {
  PLANNED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["PLANNED"],
};

export function allowedShootTransitions(from: ShootStatus): readonly ShootStatus[] {
  return TRANSITIONS[from];
}

/** Concluir exige o link do material (Drive) para o editor encontrar o bruto. */
export function shootTransitionError(
  from: ShootStatus,
  to: ShootStatus,
  materialUrl: string | null | undefined
): string | null {
  if (from === to) return "A captação já está nesse status.";
  if (!TRANSITIONS[from].includes(to)) return "Mudança de status não permitida para esta captação.";
  if (to === "COMPLETED" && !isHttpUrl(materialUrl)) {
    return materialUrl?.trim()
      ? INVALID_URL_MESSAGE
      : "Informe o link do material (Drive) para concluir a captação.";
  }
  return null;
}

/** Prazo padrão da edição: 5 dias úteis depois da gravação. */
export const EDITING_LEAD_BUSINESS_DAYS = 5;

export function editingDueDate(shootDate: Date, leadDays = EDITING_LEAD_BUSINESS_DAYS): Date {
  return addBusinessDays(shootDate, leadDays);
}

export type ShootInput = {
  clientId: string;
  title: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ownerId: string | null;
  shootType: string | null;
  notes: string | null;
  projectId: string | null;
  participantIds: string[];
  createEditingDemand: boolean;
};

export type ParsedShoot = { ok: true; value: ShootInput } | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(raw: unknown, max: number): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, max) : null;
}

export function parseShootInput(raw: Record<string, unknown>): ParsedShoot {
  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  if (!clientId) return { ok: false, error: "Selecione o cliente." };

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length < 3) return { ok: false, error: "Dê um título à captação (mínimo 3 letras)." };
  if (title.length > 120) return { ok: false, error: "Título muito longo (máximo 120)." };

  const date = parseDateKey(typeof raw.date === "string" ? raw.date : null);
  if (date === null) return { ok: false, error: "Informe a data da captação." };
  if (date === "invalid") return { ok: false, error: "Data inválida." };

  const startTime = text(raw.startTime, 5);
  const endTime = text(raw.endTime, 5);
  if ((startTime && !TIME.test(startTime)) || (endTime && !TIME.test(endTime))) {
    return { ok: false, error: "Horário inválido (use HH:MM)." };
  }
  if (endTime && !startTime) return { ok: false, error: "Informe o horário de início." };
  if (startTime && endTime && endTime <= startTime) {
    return { ok: false, error: "O fim precisa ser depois do início." };
  }

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
      date,
      startTime,
      endTime,
      location: text(raw.location, 200),
      ownerId: text(raw.ownerId, 64),
      shootType: text(raw.shootType, 60),
      notes: text(raw.notes, 4000),
      projectId: text(raw.projectId, 64),
      participantIds,
      createEditingDemand: raw.createEditingDemand === true,
    },
  };
}
