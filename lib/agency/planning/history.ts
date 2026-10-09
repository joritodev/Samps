import { planStatusLabel } from "./config";
import type { PlanCardData, PlanMemberData } from "./types";
import { WEEKDAYS, formatHours } from "./week";

type Comparable = Pick<
  PlanCardData,
  | "title"
  | "clientName"
  | "kind"
  | "category"
  | "durationHours"
  | "status"
  | "memberId"
  | "weekday"
  | "dueDate"
  | "required"
  | "recurring"
  | "notes"
>;

/** Descreve, campo a campo, o que mudou em um card (texto do histórico). */
export function describeCardChanges(
  before: Comparable,
  after: Comparable,
  members: Pick<PlanMemberData, "id" | "name">[],
  kinds: readonly { value: string; label: string }[],
) {
  const memberName = (id: unknown) =>
    id ? (members.find((m) => m.id === id)?.name ?? "outro profissional") : "não alocado";
  const dayName = (value: unknown) =>
    value ? (WEEKDAYS.find((d) => d.value === value)?.label ?? String(value)) : "não alocado";
  const dateLabel = (value: unknown) =>
    value ? String(value).split("-").reverse().join("/") : "sem prazo";
  const kindLabel = (value: unknown) =>
    kinds.find((k) => k.value === value)?.label ?? String(value ?? "");
  const boolLabel = (value: unknown) => (value ? "sim" : "não");

  const fields: { key: keyof Comparable; label: string; format: (v: unknown) => string }[] = [
    { key: "title", label: "nome", format: (v) => String(v ?? "") },
    { key: "clientName", label: "cliente", format: (v) => String(v ?? "sem cliente") },
    { key: "kind", label: "tipo", format: kindLabel },
    { key: "category", label: "categoria", format: (v) => String(v ?? "") },
    { key: "durationHours", label: "horas", format: (v) => formatHours(Number(v ?? 0)) },
    {
      key: "status",
      label: "status",
      format: (v) => planStatusLabel(v as PlanCardData["status"]),
    },
    { key: "memberId", label: "responsável", format: memberName },
    { key: "weekday", label: "dia", format: dayName },
    { key: "dueDate", label: "prazo", format: dateLabel },
    { key: "required", label: "obrigatório", format: boolLabel },
    { key: "recurring", label: "fixo semanal", format: boolLabel },
    { key: "notes", label: "observação", format: (v) => String(v ?? "sem observação") },
  ];

  const changes: string[] = [];
  for (const field of fields) {
    const oldValue = before[field.key] ?? null;
    const newValue = after[field.key] ?? null;
    const same =
      field.key === "durationHours"
        ? Math.abs(Number(oldValue ?? 0) - Number(newValue ?? 0)) < 0.0001
        : (oldValue ?? "") === (newValue ?? "");
    if (same) continue;
    changes.push(`${field.label}: ${field.format(oldValue)} → ${field.format(newValue)}`);
  }
  return changes;
}
