import type { AuditAction } from "@prisma/client";

export type DemandHistoryEntry = {
  id: string;
  kind: "deadline" | "description";
  at: string;
  userName: string | null;
  /** O que mudou, em uma linha ("Prazo", "Descrição"…). */
  label: string;
  from: string | null;
  to: string | null;
  reason: string | null;
};

const DEADLINE_LABEL: Record<string, string> = {
  dueDate: "Prazo",
  demandDeadline: "Prazo do setor",
  publishDate: "Data de publicação",
};

/** "2026-10-12T12:00:00.000Z" vira "12/10/2026" (UTC, como as datas das demandas). */
export function formatDateIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

type Row = {
  id: string;
  action: AuditAction;
  createdAt: Date;
  user: { name: string } | null;
  newValue: unknown;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Converte uma linha do histórico geral em evento do card; `null` para o que não é prazo nem descrição. */
export function toDemandHistoryEntry(row: Row): DemandHistoryEntry | null {
  const value = (row.newValue ?? {}) as Record<string, unknown>;
  const base = { id: row.id, at: row.createdAt.toISOString(), userName: row.user?.name ?? null };

  if (row.action === "DEADLINE_CHANGED") {
    const field = typeof value.field === "string" ? value.field : "dueDate";
    return {
      ...base,
      kind: "deadline",
      label: DEADLINE_LABEL[field] ?? "Prazo",
      from: formatDateIso(value.previous),
      to: formatDateIso(value.new),
      reason: text(value.justification),
    };
  }

  if (row.action === "DEMAND_UPDATED" && value.field === "description") {
    return {
      ...base,
      kind: "description",
      label: "Descrição",
      from: text(value.previous),
      to: text(value.new),
      reason: text(value.reason),
    };
  }
  return null;
}

export const MAX_DESCRIPTION = 4000;
export const MAX_REASON = 500;

export function parseReason(raw: unknown): string | null {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length > MAX_REASON) throw new Error(`O motivo pode ter até ${MAX_REASON} caracteres.`);
  return reason || null;
}

export function parseDescriptionChange(
  current: string | null,
  raw: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Descrição inválida." };
  const next = raw.trim();
  if (next.length > MAX_DESCRIPTION) return { ok: false, error: `A descrição pode ter até ${MAX_DESCRIPTION} caracteres.` };
  if (next === (current ?? "").trim()) return { ok: false, error: "A descrição não mudou." };
  return { ok: true, value: next };
}
