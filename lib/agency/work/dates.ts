/** "AAAA-MM-DD" vira meio-dia UTC (mesma convenção das demandas): não muda de dia por fuso. */
export function parseDateKey(value: string | null | undefined): Date | null | "invalid" {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return "invalid";
  return date;
}

export function toDateKey(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Soma dias úteis (seg a sex) a partir de uma data. */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return result;
}
