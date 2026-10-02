/**
 * Regras (puras) das notificações de prazo e atraso. Quem decide *quando*
 * avisar é este arquivo; o serviço só busca as demandas e grava.
 *
 * Dias de calendário em America/Sao_Paulo: o prazo é guardado como um instante
 * (ex.: 18:00 UTC) e o que importa para a equipe é o dia em que cai.
 */

export const AGENCY_TIMEZONE = "America/Sao_Paulo";

/** Janela de busca: o que pode gerar aviso hoje (atraso até 30 dias, prazo até amanhã). */
export const MAX_OVERDUE_DAYS = 30;
/** Atraso: avisa no 1º dia e depois a cada 3 dias (1, 4, 7, …). */
export const OVERDUE_REMINDER_EVERY = 3;

export type DeadlineNotificationType = "DEADLINE_NEAR" | "DEMAND_OVERDUE";

export type DeadlineCandidate = {
  id: string;
  title: string;
  dueDate: Date;
  assigneeId: string;
  clientName?: string | null;
};

export type PlannedNotification = {
  userId: string;
  type: DeadlineNotificationType;
  title: string;
  message: string;
  link: string;
};

/** Número do dia de calendário (dias desde 1970) no fuso informado. */
export function calendarDay(date: Date, timeZone: string = AGENCY_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000);
}

/** Dias até o prazo (0 = hoje, 1 = amanhã, -1 = venceu ontem). */
export function daysUntil(dueDate: Date, now: Date, timeZone?: string): number {
  return calendarDay(dueDate, timeZone) - calendarDay(now, timeZone);
}

export function demandLink(id: string) {
  return `/demandas?abrir=${id}`;
}

function describe(c: DeadlineCandidate) {
  return c.clientName ? `${c.title} · ${c.clientName}` : c.title;
}

/** Decide se esta demanda gera aviso hoje; `null` quando não gera. */
export function planDeadlineNotification(
  c: DeadlineCandidate,
  now: Date,
  options: { skipNear?: boolean; timeZone?: string } = {}
): PlannedNotification | null {
  const days = daysUntil(c.dueDate, now, options.timeZone);
  const base = { userId: c.assigneeId, link: demandLink(c.id), message: describe(c) };

  if (days === 0 || days === 1) {
    if (options.skipNear) return null;
    return {
      ...base,
      type: "DEADLINE_NEAR",
      title: days === 0 ? "Prazo hoje" : "Prazo amanhã",
    };
  }

  const late = -days;
  if (late >= 1 && late <= MAX_OVERDUE_DAYS && late % OVERDUE_REMINDER_EVERY === 1) {
    return {
      ...base,
      type: "DEMAND_OVERDUE",
      title: late === 1 ? "Demanda atrasada" : `Demanda atrasada há ${late} dias`,
    };
  }
  return null;
}

/** Tira duplicatas: o mesmo usuário não recebe duas vezes o mesmo tipo para a mesma demanda. */
export function dedupePlanned(items: PlannedNotification[]): PlannedNotification[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.userId}|${i.type}|${i.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function notificationKey(n: Pick<PlannedNotification, "userId" | "type" | "link">) {
  return `${n.userId}|${n.type}|${n.link}`;
}

/* ---------- Resumo para a gestão: atrasadas sem responsável ---------- */

export const UNASSIGNED_LINK = "/demandas?filtro=sem-responsavel";

export type UnassignedCandidate = {
  id: string;
  title: string;
  clientId: string;
  dueDate: Date;
};

/** Quem enxerga o quê: `viewAll` = todos os clientes; senão só os vinculados. */
export type ManagerScope = { id: string; viewAll: boolean; clientIds: string[] };

/**
 * Um resumo por gestor (não um aviso por demanda): quantas demandas atrasadas
 * estão sem responsável dentro do que ele enxerga e qual é a mais antiga.
 * Sem nenhuma, não avisa.
 */
export function planUnassignedOverdueDigest(
  demands: UnassignedCandidate[],
  managers: ManagerScope[],
  now: Date,
  timeZone?: string
): PlannedNotification[] {
  const overdue = demands
    .filter((d) => daysUntil(d.dueDate, now, timeZone) < 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return managers.flatMap((m) => {
    const visible = m.viewAll ? overdue : overdue.filter((d) => m.clientIds.includes(d.clientId));
    if (visible.length === 0) return [];
    const oldest = visible[0];
    const days = -daysUntil(oldest.dueDate, now, timeZone);
    const n = visible.length;
    return [
      {
        userId: m.id,
        type: "DEMAND_OVERDUE" as const,
        title:
          n === 1
            ? "1 demanda atrasada sem responsável"
            : `${n} demandas atrasadas sem responsável`,
        message: `A mais antiga: ${oldest.title}, atrasada há ${days} ${days === 1 ? "dia" : "dias"}.`,
        link: UNASSIGNED_LINK,
      },
    ];
  });
}
