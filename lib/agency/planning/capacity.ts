import { dayKeyOfWeek } from "./week";
import type {
  IsAbsentFn,
  IsoWeek,
  PlanCapacityOverrideData,
  PlanCardData,
  PlanDayBlockData,
  PlanMemberData,
} from "./types";

/**
 * Capacidade (horas) da pessoa no dia. Precedência:
 * bloqueio ou ausência → 0; ajuste da semana+dia; ajuste fixo do dia da semana; padrão da pessoa.
 */
export function capacityFor(
  member: Pick<PlanMemberData, "id" | "defaultCapacityHours">,
  week: IsoWeek,
  weekday: number,
  overrides: PlanCapacityOverrideData[],
  blocks: PlanDayBlockData[],
  isAbsent?: IsAbsentFn,
) {
  const blocked = blocks.some(
    (b) =>
      b.isoYear === week.year &&
      b.isoWeek === week.week &&
      b.weekday === weekday &&
      (b.memberId === null || b.memberId === member.id),
  );
  if (blocked) return 0;
  if (isAbsent?.(member.id, dayKeyOfWeek(week, weekday))) return 0;
  const exact = overrides.find(
    (o) =>
      o.memberId === member.id &&
      o.isoYear === week.year &&
      o.isoWeek === week.week &&
      o.weekday === weekday,
  );
  if (exact) return exact.hours;
  const weekdayOnly = overrides.find(
    (o) =>
      o.memberId === member.id &&
      o.isoYear === null &&
      o.isoWeek === null &&
      o.weekday === weekday,
  );
  if (weekdayOnly) return weekdayOnly.hours;
  return member.defaultCapacityHours;
}

/** Horas já ocupadas por cards da pessoa no dia. */
export function usedHours(
  cards: Pick<PlanCardData, "memberId" | "weekday" | "durationHours">[],
  memberId: string,
  weekday: number,
) {
  return cards
    .filter((c) => c.memberId === memberId && c.weekday === weekday)
    .reduce((sum, c) => sum + c.durationHours, 0);
}

/** Card sem dia ou sem pessoa fica no backlog ("não alocado"). */
export function isBacklogCard(card: Pick<PlanCardData, "weekday" | "memberId">) {
  return !card.weekday || !card.memberId;
}

/**
 * Combinações que aproveitam exatamente as horas livres.
 * Ex.: 3h livres → "3 de 1h", "1 de 2h + 1 de 1h", "1 de 3h".
 */
export function slotSuggestions(free: number, presetHours?: number[]) {
  if (free <= 0) return [] as string[];
  const sizes = Array.from(
    new Set((presetHours?.length ? presetHours : [0.5, 1, 2, 3, 6]).filter((h) => h > 0)),
  ).sort((a, b) => a - b);
  const results: string[] = [];
  const step = (index: number, remaining: number, picked: number[]) => {
    if (results.length >= 4) return;
    if (Math.abs(remaining) < 0.01) {
      const counts = new Map<number, number>();
      for (const h of picked) counts.set(h, (counts.get(h) ?? 0) + 1);
      const label = Array.from(counts.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([h, n]) => `${n} de ${h < 1 ? `${Math.round(h * 60)}min` : `${h}h`}`)
        .join(" + ");
      if (label && !results.includes(label)) results.push(label);
      return;
    }
    if (index >= sizes.length || remaining < sizes[0]! - 0.01) return;
    const size = sizes[index]!;
    const max = Math.floor((remaining + 0.01) / size);
    for (let n = max; n >= 0; n--) {
      step(index + 1, remaining - n * size, [...picked, ...Array<number>(n).fill(size)]);
    }
  };
  step(0, free, []);
  return results.slice(0, 3);
}
