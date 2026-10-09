import type { IsoWeek } from "./types";

/**
 * Semana ISO (segunda a domingo) e rótulos do quadro. Datas em UTC "de calendário":
 * o dia do quadro não depende do fuso de quem abre a tela.
 */

function toUtcDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function isoWeekOf(date: Date): IsoWeek {
  const d = toUtcDate(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

/** Semana ISO de uma data `AAAA-MM-DD`, sem depender do fuso local. */
export function isoWeekOfKey(key: string): IsoWeek {
  const [y, m, d] = key.split("-").map(Number);
  return isoWeekOf(new Date(y!, m! - 1, d!));
}

/**
 * Segunda-feira da semana ISO. A semana 1 é a que contém 4 de janeiro (o painel
 * original ancorava em 1º de janeiro e errava a semana 1 de 2027, por exemplo).
 */
export function mondayOfIsoWeek({ year, week }: IsoWeek): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - (day - 1) + (week - 1) * 7);
  return jan4;
}

export function weeksInIsoYear(year: number) {
  return isoWeekOf(new Date(year, 11, 28)).week;
}

export function shiftWeek(current: IsoWeek, delta: number): IsoWeek {
  const monday = mondayOfIsoWeek(current);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeekOf(
    new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
  );
}

export function sameWeek(a: IsoWeek, b: IsoWeek) {
  return a.year === b.year && a.week === b.week;
}

export const WEEKDAYS = [
  { value: 1, short: "SEG", label: "Segunda" },
  { value: 2, short: "TER", label: "Terça" },
  { value: 3, short: "QUA", label: "Quarta" },
  { value: 4, short: "QUI", label: "Quinta" },
  { value: 5, short: "SEX", label: "Sexta" },
  { value: 6, short: "SÁB", label: "Sábado" },
] as const;

/** Data (UTC) do dia `weekday` (1 = segunda) da semana. */
export function dayDate(week: IsoWeek, weekday: number) {
  const d = new Date(mondayOfIsoWeek(week));
  d.setUTCDate(d.getUTCDate() + weekday - 1);
  return d;
}

/** `AAAA-MM-DD` do dia `weekday` da semana. */
export function dayKeyOfWeek(week: IsoWeek, weekday: number) {
  return dayDate(week, weekday).toISOString().slice(0, 10);
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export function weekRangeLabel(week: IsoWeek) {
  return `Semana ${week.week} — ${formatDate(mondayOfIsoWeek(week))} a ${formatDate(dayDate(week, 6))}`;
}

export function formatHours(value: number) {
  const total = Math.round(Math.abs(value) * 60);
  const sign = value < 0 ? "-" : "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${sign}${m} min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}
