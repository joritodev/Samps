import type { AgendaEvent } from "./agenda-events";

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** Datas de aniversário são armazenadas em UTC; comparação usa UTC para não virar o dia. */
export function birthdayOccurrenceInYear(
  birthDate: Date | string,
  year: number
) {
  const d = toDate(birthDate);
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const isLeapTarget = new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29;
  const safeDay = month === 1 && day === 29 && !isLeapTarget ? 28 : day;
  return new Date(Date.UTC(year, month, safeDay));
}

export function isBirthdayToday(
  birthDate: Date | string | null | undefined,
  today: Date = new Date()
) {
  if (!birthDate) return false;
  const d = toDate(birthDate);
  return (
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate()
  );
}

export type BirthdayPerson = {
  id: string;
  name: string;
  birthDate: Date | string;
  kindOf: "client" | "user";
};

export function mapBirthdaysToAgendaEvents(
  people: BirthdayPerson[],
  year: number
): AgendaEvent[] {
  return people.map((person) => ({
    id: `birthday:${person.kindOf}:${person.id}`,
    demandId: null,
    title:
      person.kindOf === "client"
        ? `Aniversário do cliente ${person.name}`
        : `Aniversário de ${person.name}`,
    clientId: person.kindOf === "client" ? person.id : null,
    clientName: person.kindOf === "client" ? person.name : "Equipe",
    sectorId: null,
    sectorSlug: null,
    sectorName: null,
    kind: "birthday",
    date: birthdayOccurrenceInYear(person.birthDate, year).toISOString(),
    status: "BIRTHDAY",
    assigneeName: person.kindOf === "user" ? person.name : null,
  }));
}
