import { capacityFor, isBacklogCard } from "./capacity";
import { WEEKDAYS, isoWeekOfKey, weeksInIsoYear } from "./week";
import type {
  IsAbsentFn,
  IsoWeek,
  PlanCapacityOverrideData,
  PlanCardData,
  PlanDayBlockData,
  PlanMemberData,
} from "./types";

export const BACKLOG = "backlog";

/** Identificador da coluna (pessoa × dia) usada no agrupamento e no arrastar e soltar. */
export function containerKey(memberId: string, weekday: number) {
  return `${memberId}:${weekday}`;
}

export function parseContainerKey(key: string): { memberId: string; weekday: number } | null {
  if (key === BACKLOG) return null;
  const index = key.lastIndexOf(":");
  if (index <= 0) return null;
  const weekday = Number(key.slice(index + 1));
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 6) return null;
  return { memberId: key.slice(0, index), weekday };
}

/** Agrupa os cards por coluna, na ordem de `position`. Quem não tem dia e pessoa vai ao backlog. */
export function groupCards(cards: PlanCardData[]) {
  const groups = new Map<string, PlanCardData[]>();
  const sorted = [...cards].sort(
    (a, b) => a.position - b.position || a.title.localeCompare(b.title),
  );
  for (const card of sorted) {
    const key =
      isBacklogCard(card) ? BACKLOG : containerKey(card.memberId!, card.weekday!);
    const list = groups.get(key);
    if (list) list.push(card);
    else groups.set(key, [card]);
  }
  return groups;
}

export type MemberTotals = {
  member: PlanMemberData;
  capacity: number;
  used: number;
  free: number;
  items: number;
};

export type WeekTotals = {
  perMember: MemberTotals[];
  capacity: number;
  used: number;
  free: number;
  items: number;
  byKind: { label: string; count: number; hours: number }[];
};

/** Totais da semana (cards alocados nesta semana). `defaultKind` conta "vídeos"/"peças". */
export function computeWeekTotals(params: {
  week: IsoWeek;
  members: PlanMemberData[];
  cards: PlanCardData[];
  overrides: PlanCapacityOverrideData[];
  blocks: PlanDayBlockData[];
  isAbsent?: IsAbsentFn;
  defaultKind: string;
  kinds: readonly { value: string; label: string }[];
}): WeekTotals {
  const { week, members, cards, overrides, blocks, isAbsent, defaultKind, kinds } = params;
  const allocated = cards.filter(
    (c) => !isBacklogCard(c) && c.isoYear === week.year && c.isoWeek === week.week,
  );
  const perMember = members.map((member) => {
    let capacity = 0;
    for (const day of WEEKDAYS) {
      capacity += capacityFor(member, week, day.value, overrides, blocks, isAbsent);
    }
    const mine = allocated.filter((c) => c.memberId === member.id);
    const used = mine.reduce((sum, c) => sum + c.durationHours, 0);
    return {
      member,
      capacity,
      used,
      free: capacity - used,
      items: mine.filter((c) => c.kind === defaultKind).length,
    };
  });
  const capacity = perMember.reduce((s, m) => s + m.capacity, 0);
  const used = perMember.reduce((s, m) => s + m.used, 0);
  return {
    perMember,
    capacity,
    used,
    free: capacity - used,
    items: allocated.filter((c) => c.kind === defaultKind).length,
    byKind: kinds
      .map((k) => {
        const ofKind = allocated.filter((c) => c.kind === k.value);
        return {
          label: k.label,
          count: ofKind.length,
          hours: ofKind.reduce((s, c) => s + c.durationHours, 0),
        };
      })
      .filter((item) => item.count > 0),
  };
}

/** `?semana=2026-37` → semana ISO válida, ou null. */
export function parseWeekParam(value: string | undefined | null): IsoWeek | null {
  const match = /^(\d{4})-(\d{1,2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (year < 2020 || year > 2100) return null;
  if (week < 1 || week > weeksInIsoYear(year)) return null;
  return { year, week };
}

export function formatWeekParam(week: IsoWeek) {
  return `${week.year}-${String(week.week).padStart(2, "0")}`;
}

/** Semana ISO do dia `AAAA-MM-DD` (use `dayKey` de São Paulo para "hoje"). */
export function currentWeekFromDayKey(key: string): IsoWeek {
  return isoWeekOfKey(key);
}

export const COL_WIDTH_DEFAULT = 420;
export const COL_WIDTH_MIN = 240;
export const COL_WIDTH_MAX = 520;
export const COL_WIDTH_STEP = 40;
const COL_WIDTH_FIT_MIN = 180;
const COL_WIDTH_FIT_MAX = 720;
const COLUMN_GAP = 12;

export function clampColumnWidth(width: number) {
  return Math.min(COL_WIDTH_MAX, Math.max(COL_WIDTH_MIN, width));
}

/** Largura de coluna para caber os 6 dias na largura disponível ("Semana inteira"). */
export function fittedColumnWidth(containerWidth: number) {
  const days = WEEKDAYS.length;
  const width = Math.floor((containerWidth - COLUMN_GAP * (days - 1)) / days);
  return Math.min(COL_WIDTH_FIT_MAX, Math.max(COL_WIDTH_FIT_MIN, width));
}

export function zoomPercent(width: number) {
  return Math.round((width / COL_WIDTH_DEFAULT) * 100);
}
