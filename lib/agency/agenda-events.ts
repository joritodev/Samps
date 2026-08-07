export type AgendaEventKind =
  | "due"
  | "delivery"
  | "publish"
  | "birthday"
  | "absence";

export type AgendaEvent = {
  id: string;
  demandId: string | null;
  title: string;
  clientId: string | null;
  clientName: string;
  sectorId: string | null;
  sectorSlug: string | null;
  sectorName: string | null;
  kind: AgendaEventKind;
  /** ISO date string */
  date: string;
  status: string;
  assigneeName: string | null;
};

export const AGENDA_KIND_LABEL: Record<AgendaEventKind, string> = {
  due: "Prazo",
  delivery: "Entrega",
  publish: "Publicação",
  birthday: "Aniversário",
  absence: "Ausência",
};

type DemandLike = {
  id: string;
  title: string;
  status: string;
  dueDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  publishDate?: Date | string | null;
  client?: { id: string; name: string } | null;
  assignee?: { name: string } | null;
  sector?: { id: string; name: string; slug?: string | null } | null;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Expand each demand into up to three calendar events (due / delivery / publish). */
export function mapDemandsToAgendaEvents(demands: DemandLike[]): AgendaEvent[] {
  const events: AgendaEvent[] = [];

  for (const d of demands) {
    const base = {
      demandId: d.id,
      title: d.title,
      clientId: d.client?.id ?? null,
      clientName: d.client?.name ?? "—",
      sectorId: d.sector?.id ?? null,
      sectorSlug: d.sector?.slug ?? null,
      sectorName: d.sector?.name ?? null,
      status: d.status,
      assigneeName: d.assignee?.name ?? null,
    };

    if (d.dueDate) {
      events.push({
        ...base,
        id: `${d.id}:due`,
        kind: "due",
        date: toIso(d.dueDate),
      });
    }
    if (d.deliveryDate) {
      events.push({
        ...base,
        id: `${d.id}:delivery`,
        kind: "delivery",
        date: toIso(d.deliveryDate),
      });
    }
    if (d.publishDate) {
      events.push({
        ...base,
        id: `${d.id}:publish`,
        kind: "publish",
        date: toIso(d.publishDate),
      });
    }
  }

  return events;
}
