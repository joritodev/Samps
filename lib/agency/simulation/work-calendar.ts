import { DAY_MS, addDays, dayKey, startOfDayMs } from "@/lib/agency/sp-calendar";

/** Feriados nacionais que caem em dia útil dentro da janela simulada. */
const HOLIDAYS = new Set([
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-20",
  "2026-12-25",
]);

const MINUTE_MS = 60 * 1000;

/** Turnos do dia útil, em minutos desde 00:00 de São Paulo. */
const SHIFTS: [number, number][] = [
  [9 * 60, 12 * 60],
  [13 * 60, 18 * 60],
];

export function isBusinessDay(key: string): boolean {
  const weekday = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !HOLIDAYS.has(key);
}

export function nextBusinessDay(key: string): string {
  let current = key;
  while (!isBusinessDay(current)) current = addDays(current, 1);
  return current;
}

/** `n` dias úteis para frente (ou para trás, se negativo) a partir de `key`. */
export function addBusinessDays(key: string, n: number): string {
  const step = n < 0 ? -1 : 1;
  let current = key;
  let left = Math.abs(n);
  while (left > 0) {
    current = addDays(current, step);
    if (isBusinessDay(current)) left -= 1;
  }
  return current;
}

export function businessDaysOfMonth(year: number, month: number): string[] {
  const pad = (v: number) => String(v).padStart(2, "0");
  const days: string[] = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day += 1) {
    const key = `${year}-${pad(month)}-${pad(day)}`;
    if (isBusinessDay(key)) days.push(key);
  }
  return days;
}

/** Instante (ms) de `hour:minute` de São Paulo no dia `key`. */
export function at(key: string, hour: number, minute = 0): number {
  return startOfDayMs(key) + (hour * 60 + minute) * MINUTE_MS;
}

function minuteOfDay(ms: number): number {
  return Math.round((ms - startOfDayMs(dayKey(new Date(ms)))) / MINUTE_MS);
}

/** Primeiro instante em que dá para trabalhar a partir de `ms` (pula noite, almoço e folgas). */
export function clampToWork(ms: number): number {
  let key = dayKey(new Date(ms));
  if (!isBusinessDay(key)) return at(nextBusinessDay(key), 9);
  const minute = minuteOfDay(ms);
  for (const [from, to] of SHIFTS) {
    if (minute < from) return at(key, 0, from);
    if (minute < to) return ms;
  }
  key = nextBusinessDay(addDays(key, 1));
  return at(key, 9);
}

function shiftEnd(ms: number): number {
  const key = dayKey(new Date(ms));
  const minute = minuteOfDay(ms);
  const shift = SHIFTS.find(([from, to]) => minute >= from && minute < to)!;
  return at(key, 0, shift[1]);
}

export type Interval = { start: number; end: number };

/**
 * Reserva `minutes` de trabalho a partir de `from`, nas janelas livres de
 * `busy`. Devolve um trecho por turno; nunca sobrepõe o que já está ocupado.
 */
export function takeSlots(busy: Interval[], from: number, minutes: number): Interval[] {
  const out: Interval[] = [];
  let left = minutes;
  let t = clampToWork(from);
  while (left > 0) {
    const clash = busy.find((b) => b.start < t + MINUTE_MS && b.end > t);
    if (clash) {
      t = clampToWork(clash.end);
      continue;
    }
    let limit = shiftEnd(t);
    for (const b of busy) if (b.start > t && b.start < limit) limit = b.start;
    const take = Math.min(left, Math.floor((limit - t) / MINUTE_MS));
    if (take <= 0) {
      t = clampToWork(limit);
      continue;
    }
    out.push({ start: t, end: t + take * MINUTE_MS });
    left -= take;
    t = clampToWork(t + take * MINUTE_MS);
  }
  return out;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export { DAY_MS, MINUTE_MS };
