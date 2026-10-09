import type { IsoWeek, PlanCardData, PlanTemplateData } from "./types";

/** Dados de um card novo, sem id nem setor (o serviço completa). */
export type NewPlanCardRow = Omit<PlanCardData, "id">;

/**
 * Cards que faltam na semana para cumprir os modelos recorrentes ativos.
 * Um modelo com N por semana e M já existentes gera N−M cards novos.
 */
export function planWeekFromTemplates(
  week: IsoWeek,
  templates: PlanTemplateData[],
  existing: Pick<PlanCardData, "templateId">[],
): NewPlanCardRow[] {
  const rows: NewPlanCardRow[] = [];
  let position = existing.length;
  for (const template of templates.filter((t) => t.active)) {
    const already = existing.filter((c) => c.templateId === template.id).length;
    const missing = Math.max(0, template.weeklyQuantity - already);
    for (let i = 0; i < missing; i++) {
      const allocated = Boolean(template.preferredMemberId && template.preferredWeekday);
      rows.push({
        isoYear: week.year,
        isoWeek: week.week,
        weekday: template.preferredWeekday,
        memberId: template.preferredMemberId,
        kind: template.kind,
        clientId: template.clientId,
        clientName: template.clientName,
        demandId: null,
        templateId: template.id,
        title:
          template.weeklyQuantity > 1 ? `${template.title} ${already + i + 1}` : template.title,
        category: template.category,
        durationHours: template.durationHours,
        status: allocated ? "PROGRAMADO" : "NAO_ALOCADO",
        pinned: allocated,
        required: template.required,
        recurring: true,
        dueDate: null,
        notes: null,
        position: position++,
      });
    }
  }
  return rows;
}

/** Copia para `week` os cards recorrentes da semana anterior que ainda não existem nela. */
export function planDuplicateWeek(
  week: IsoWeek,
  previousRecurring: PlanCardData[],
  existing: PlanCardData[],
): NewPlanCardRow[] {
  let position = existing.length;
  return previousRecurring
    .filter(
      (c) =>
        c.recurring &&
        !existing.some(
          (e) =>
            (c.templateId && e.templateId === c.templateId && e.title === c.title) ||
            (e.title === c.title && e.weekday === c.weekday && e.memberId === c.memberId),
        ),
    )
    .map((c) => ({
      isoYear: week.year,
      isoWeek: week.week,
      weekday: c.weekday,
      memberId: c.memberId,
      kind: c.kind,
      clientId: c.clientId,
      clientName: c.clientName,
      demandId: null,
      templateId: c.templateId,
      title: c.title,
      category: c.category,
      durationHours: c.durationHours,
      status: c.weekday && c.memberId ? ("PROGRAMADO" as const) : ("NAO_ALOCADO" as const),
      pinned: c.pinned,
      required: c.required,
      recurring: true,
      dueDate: null,
      notes: c.notes,
      position: position++,
    }));
}
