import type { AgendaEvent } from "./agenda-events";

export const ABSENCE_KIND_LABEL: Record<string, string> = {
  DAY_OFF: "Folga",
  VACATION: "Férias",
  OFFLINE: "Indisponível",
  SICK_LEAVE: "Atestado",
};

export function absenceKindLabel(kind: string) {
  return ABSENCE_KIND_LABEL[kind] ?? kind;
}

function startOfUtcDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function utcDayDate(ms: number) {
  return new Date(ms);
}

/** Intervalo inclusivo nas duas pontas, comparado por dia em UTC. */
export function isAbsentOn(
  absence: { startsAt: Date; endsAt: Date; canceledAt?: Date | null },
  day: Date
) {
  if (absence.canceledAt) return false;
  const target = startOfUtcDay(day);
  return (
    target >= startOfUtcDay(absence.startsAt) &&
    target <= startOfUtcDay(absence.endsAt)
  );
}

export type AbsenceAgendaSource = {
  id: string;
  kind: string;
  startsAt: Date;
  endsAt: Date;
  canceledAt?: Date | null;
  user: { id: string; name: string };
};

/**
 * Um evento por dia UTC do intervalo (AgendaView não ganha span multi-dia).
 * Ausências canceladas são omitidas.
 */
export function mapAbsencesToAgendaEvents(
  absences: AbsenceAgendaSource[]
): AgendaEvent[] {
  const events: AgendaEvent[] = [];

  for (const absence of absences) {
    if (absence.canceledAt) continue;

    let cursor = startOfUtcDay(absence.startsAt);
    const end = startOfUtcDay(absence.endsAt);
    const label = absenceKindLabel(absence.kind);

    while (cursor <= end) {
      const date = utcDayDate(cursor);
      events.push({
        id: `absence:${absence.id}:${date.toISOString().slice(0, 10)}`,
        demandId: null,
        title: `${label} — ${absence.user.name}`,
        clientId: null,
        clientName: "Equipe",
        sectorId: null,
        sectorSlug: null,
        sectorName: null,
        kind: "absence",
        date: date.toISOString(),
        status: "ABSENCE",
        assigneeName: absence.user.name,
      });
      cursor += 24 * 60 * 60 * 1000;
    }
  }

  return events;
}

export function formatAbsenceRange(startsAt: Date | string, endsAt: Date | string) {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });
  if (startOfUtcDay(start) === startOfUtcDay(end)) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}
