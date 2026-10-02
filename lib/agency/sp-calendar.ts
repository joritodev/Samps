// O dia da agência é o de São Paulo. O Brasil não tem horário de verão desde
// 2019, então o deslocamento fixo de -3 h é exato.
export const DAY_MS = 24 * 60 * 60 * 1000;
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `AAAA-MM-DD` do dia de São Paulo em que o instante cai. */
export function dayKey(date: Date): string {
  return new Date(date.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10);
}

/** Primeiro instante do dia `key` (00:00 em São Paulo), em ms. */
export function startOfDayMs(key: string): number {
  return Date.parse(`${key}T00:00:00.000Z`) + SP_OFFSET_MS;
}

/** Último instante do dia `key` (23:59:59.999 em São Paulo), em ms. */
export function endOfDayMs(key: string): number {
  return startOfDayMs(key) + DAY_MS - 1;
}

export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Valida `AAAA-MM-DD` de verdade (rejeita 2026-02-31). */
export function isValidDayKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
