import { capacityFor, isBacklogCard } from "./capacity";
import { isoWeekOf, mondayOfIsoWeek } from "./week";
import type {
  IsAbsentFn,
  IsoWeek,
  PlanCapacityOverrideData,
  PlanCardData,
  PlanDayBlockData,
  PlanMemberData,
} from "./types";

export type DistributionMove = {
  card: PlanCardData;
  fromMemberId: string | null;
  fromWeekday: number | null;
  fromYear: number;
  fromWeek: number;
  toMemberId: string;
  toWeekday: number;
  toYear: number;
  toWeek: number;
  toDate: string;
  /** Card recorrente que precisou sair da semana em que estava originalmente. */
  outsideOriginalWeek?: boolean;
};

export type DistributionResult = {
  moves: DistributionMove[];
  /** Cards que não couberam respeitando fixos e prazos. */
  unplaced: PlanCardData[];
  /** Cards que precisariam ser liberados para caber o restante. */
  blockers: PlanCardData[];
};

/** Compromissos (captação, reunião) não saem do lugar na distribuição. */
const APPOINTMENT_KINDS = ["captacao", "reuniao"];

/** Dia da semana (1-6) limite para um card com prazo, ou null se não houver prazo. */
export function deadlineWeekday(
  card: Pick<PlanCardData, "dueDate">,
  mondayIso: string,
): number | null {
  if (!card.dueDate) return null;
  const monday = new Date(`${mondayIso}T00:00:00Z`).getTime();
  const due = new Date(`${card.dueDate}T00:00:00Z`).getTime();
  const diff = Math.round((due - monday) / 86400000);
  if (diff < 0) return 1; // prazo vencido: o quanto antes
  if (diff > 5) return 6; // prazo depois desta semana
  return diff + 1;
}

type Slot = {
  memberId: string;
  weekday: number;
  year: number;
  week: number;
  date: string;
  capacity: number;
  used: number;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateFromIso(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isLockedCard(
  card: Pick<PlanCardData, "pinned" | "recurring" | "kind" | "status">,
) {
  return (
    card.pinned ||
    card.recurring ||
    APPOINTMENT_KINDS.includes(card.kind) ||
    card.status === "CONCLUIDO"
  );
}

/**
 * Distribui primeiro apenas o backlog, procurando a vaga futura mais próxima.
 * `relaxed = true` permite reorganizar cards já alocados quando o backlog não cabe.
 * `variant` gera alternativas diferentes a cada clique em "Outra sugestão".
 */
export function suggestDistribution(params: {
  backlog: PlanCardData[];
  allocatedCards: PlanCardData[];
  team: PlanMemberData[];
  /** AAAA-MM-DD de hoje (dia de São Paulo). */
  todayIso: string;
  overrides: PlanCapacityOverrideData[];
  blocks: PlanDayBlockData[];
  isAbsent?: IsAbsentFn;
  horizonDays?: number;
  relaxed?: boolean;
  variant?: number;
}): DistributionResult {
  const {
    backlog,
    allocatedCards,
    team,
    todayIso,
    overrides,
    blocks,
    isAbsent,
    horizonDays = 28,
    relaxed = false,
    variant = 0,
  } = params;

  const today = dateFromIso(todayIso);
  const defaultEnd = addUtcDays(today, Math.max(1, horizonDays) - 1);
  const defaultEndIso = isoDate(defaultEnd);
  const latestDeadline = [...backlog, ...(relaxed ? allocatedCards : [])]
    .map((card) => card.dueDate)
    .filter((date): date is string => date !== null && date >= todayIso)
    .sort()
    .at(-1);
  const end =
    latestDeadline && latestDeadline > defaultEndIso ? dateFromIso(latestDeadline) : defaultEnd;

  /** Card fixo devolvido ao backlog volta a procurar vaga na semana em que estava. */
  const originWindow = (card: PlanCardData) => {
    if (!card.recurring || !isBacklogCard(card)) return null;
    const monday = mondayOfIsoWeek({ year: card.isoYear, week: card.isoWeek });
    return { start: isoDate(monday), end: isoDate(addUtcDays(monday, 5)) };
  };

  const protectedCards = relaxed ? allocatedCards.filter(isLockedCard) : allocatedCards;
  const movableAllocated = relaxed ? allocatedCards.filter((card) => !isLockedCard(card)) : [];

  // A janela de slots precisa cobrir também as semanas de origem dos fixos.
  let rangeStart = today;
  for (const card of backlog) {
    const window = originWindow(card);
    if (window && dateFromIso(window.start) < rangeStart) rangeStart = dateFromIso(window.start);
  }

  const slots: Slot[] = [];
  for (let date = rangeStart; date <= end; date = addUtcDays(date, 1)) {
    const weekday = date.getUTCDay() || 7;
    if (weekday > 6) continue;
    const slotWeek: IsoWeek = isoWeekOf(
      new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    for (const member of team) {
      const capacity = capacityFor(member, slotWeek, weekday, overrides, blocks, isAbsent);
      if (capacity <= 0) continue;
      slots.push({
        memberId: member.id,
        weekday,
        year: slotWeek.year,
        week: slotWeek.week,
        date: isoDate(date),
        capacity,
        used: 0,
      });
    }
  }
  for (const c of protectedCards) {
    if (!c.memberId || !c.weekday) continue;
    const slot = slots.find(
      (s) =>
        s.memberId === c.memberId &&
        s.weekday === c.weekday &&
        s.year === c.isoYear &&
        s.week === c.isoWeek,
    );
    if (slot) slot.used += c.durationHours;
  }

  // Backlog primeiro; na tentativa flexível, os já alocados entram depois e tendem a permanecer.
  const ordered = [...backlog, ...movableAllocated].sort((a, b) => {
    const aBacklog = isBacklogCard(a);
    const bBacklog = isBacklogCard(b);
    if (aBacklog !== bBacklog) return aBacklog ? -1 : 1;
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.dueDate !== b.dueDate) return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    return b.durationHours - a.durationHours;
  });
  const moves: DistributionMove[] = [];
  const unplaced: PlanCardData[] = [];

  for (const card of ordered) {
    const window = originWindow(card);
    const pick = (from: string, to: string) =>
      slots
        .filter(
          (s) =>
            s.date >= from &&
            s.date <= to &&
            (!card.dueDate || s.date <= card.dueDate) &&
            (!card.memberId || s.memberId === card.memberId) &&
            s.capacity - s.used >= card.durationHours - 0.001,
        )
        .map((s) => {
          const leftover = s.capacity - s.used - card.durationHours;
          const waste = leftover > 0 && leftover < 0.5 ? 2 : 0;
          const sameSlot =
            card.memberId === s.memberId &&
            card.weekday === s.weekday &&
            card.isoYear === s.year &&
            card.isoWeek === s.week;
          const preferredMember = card.memberId === s.memberId ? -1.5 : 0;
          const keepAllocated = sameSlot ? -1000 : 0;
          const load = s.used / Math.max(s.capacity, 1);
          const memberIndex = Math.max(0, team.findIndex((member) => member.id === s.memberId));
          const variantNudge = variant
            ? ((memberIndex + variant) % Math.max(team.length, 1)) * 0.01
            : 0;
          return { slot: s, score: keepAllocated + waste + preferredMember + load * 2 + variantNudge };
        })
        .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || a.score - b.score);

    let chosen = window ? pick(window.start, window.end)[0]?.slot : undefined;
    let outsideOriginalWeek = false;
    if (!chosen) {
      if (window) outsideOriginalWeek = true;
      chosen = pick(todayIso, card.dueDate ?? defaultEndIso)[0]?.slot;
    }
    if (!chosen) {
      unplaced.push(card);
      continue;
    }
    chosen.used += card.durationHours;
    if (
      card.memberId !== chosen.memberId ||
      card.weekday !== chosen.weekday ||
      card.isoYear !== chosen.year ||
      card.isoWeek !== chosen.week
    ) {
      moves.push({
        card,
        fromMemberId: card.memberId,
        fromWeekday: card.weekday,
        fromYear: card.isoYear,
        fromWeek: card.isoWeek,
        toMemberId: chosen.memberId,
        toWeekday: chosen.weekday,
        toYear: chosen.year,
        toWeek: chosen.week,
        toDate: chosen.date,
        outsideOriginalWeek: outsideOriginalWeek || undefined,
      });
    }
  }

  const blockers = unplaced.length
    ? allocatedCards.filter((card) => !relaxed && !isLockedCard(card))
    : [];

  return { moves, unplaced, blockers };
}
