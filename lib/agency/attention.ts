/** Motivo pelo qual uma demanda precisa da gestão agora. */
export type AttentionReason = "overdue" | "unassigned" | "due-soon" | "priority";

type AttentionInput = {
  dueDate?: Date | null;
  assigneeId?: string | null;
  priorityWeight?: number | null;
};

const DAY = 24 * 60 * 60 * 1000;
const SOON_MS = 2 * DAY;

const REASON_RANK: Record<AttentionReason, number> = {
  overdue: 0,
  unassigned: 1,
  "due-soon": 2,
  priority: 3,
};

export function attentionReason(d: AttentionInput, now: Date): AttentionReason {
  const due = d.dueDate ? new Date(d.dueDate).getTime() : null;
  if (due !== null && due < now.getTime()) return "overdue";
  if (!d.assigneeId) return "unassigned";
  if (due !== null && due - now.getTime() <= SOON_MS) return "due-soon";
  return "priority";
}

/**
 * Ordena para "Precisa de você": atrasada > sem responsável > vence em 48h >
 * prioridade. Dentro do mesmo motivo, maior peso e prazo mais próximo primeiro.
 */
export function rankByAttention<T extends AttentionInput>(items: T[], now: Date) {
  return items
    .map((item) => ({ item, reason: attentionReason(item, now) }))
    .sort((a, b) => {
      const byReason = REASON_RANK[a.reason] - REASON_RANK[b.reason];
      if (byReason) return byReason;
      const byWeight = (b.item.priorityWeight ?? 0) - (a.item.priorityWeight ?? 0);
      if (byWeight) return byWeight;
      const ad = a.item.dueDate ? new Date(a.item.dueDate).getTime() : Infinity;
      const bd = b.item.dueDate ? new Date(b.item.dueDate).getTime() : Infinity;
      return ad - bd;
    });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Prazo em linguagem de agenda: "vence hoje", "atrasada há 2 dias". */
export function relativeDue(dueDate: Date | string, now: Date): string {
  const days = Math.round((startOfDay(new Date(dueDate)) - startOfDay(now)) / DAY);
  if (days === 0) return new Date(dueDate).getTime() < now.getTime() ? "venceu hoje" : "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days === -1) return "atrasada há 1 dia";
  if (days < 0) return `atrasada há ${-days} dias`;
  return `vence em ${days} dias`;
}

export function attentionLabel(
  reason: AttentionReason,
  dueDate: Date | string | null | undefined,
  now: Date
): string {
  if (reason === "unassigned") return "Sem responsável";
  if ((reason === "overdue" || reason === "due-soon") && dueDate) {
    const text = relativeDue(dueDate, now);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return "Alta prioridade";
}
