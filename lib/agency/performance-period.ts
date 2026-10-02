import {
  addDays,
  dayKey,
  endOfDayMs,
  isValidDayKey,
  startOfDayMs,
} from "@/lib/agency/sp-calendar";

export type PerformancePreset = "today" | "week" | "month" | "quarter" | "lastquarter" | "custom";

type PerformanceRangeInput = {
  preset?: string;
  from?: string;
  to?: string;
  now?: Date;
};

type PerformanceRange = {
  from: Date;
  to: Date;
  preset: PerformancePreset;
};

/** Primeiro dia do trimestre em que `key` cai. */
function quarterStart(key: string): string {
  const month = Number(key.slice(5, 7));
  const first = String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0");
  return `${key.slice(0, 4)}-${first}-01`;
}

/** Soma `months` meses a um primeiro-dia-do-mês (`AAAA-MM-01`). */
function addMonths(firstOfMonth: string, months: number): string {
  const d = new Date(Date.UTC(Number(firstOfMonth.slice(0, 4)), Number(firstOfMonth.slice(5, 7)) - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

function range(fromKey: string, toKey: string, preset: PerformancePreset): PerformanceRange {
  return {
    from: new Date(startOfDayMs(fromKey)),
    to: new Date(endOfDayMs(toKey)),
    preset,
  };
}

/**
 * Período do relatório em dias de São Paulo. Sem preset válido, mês atual
 * até hoje. "Semana" são os últimos 7 dias; "trimestre" vai do começo do
 * trimestre até hoje; datas livres (`from` e `to` válidas) ganham sempre.
 */
export function resolvePerformanceRange(
  input: PerformanceRangeInput,
): PerformanceRange {
  const today = dayKey(input.now ?? new Date());

  if (isValidDayKey(input.from) && isValidDayKey(input.to)) {
    const [start, end] =
      input.from <= input.to ? [input.from, input.to] : [input.to, input.from];
    return range(start, end, "custom");
  }

  if (input.preset === "today") return range(today, today, "today");
  if (input.preset === "week") return range(addDays(today, -6), today, "week");

  if (input.preset === "quarter") return range(quarterStart(today), today, "quarter");

  if (input.preset === "lastquarter") {
    const start = quarterStart(addDays(quarterStart(today), -1));
    return range(start, addDays(quarterStart(today), -1), "lastquarter");
  }

  return range(`${today.slice(0, 7)}-01`, today, "month");
}

/**
 * Período contra o qual comparar. Mês e trimestre em andamento comparam com os
 * mesmos dias do anterior (não com os dias corridos logo antes, que em início
 * de mês seriam do mês passado); trimestre fechado compara com o anterior
 * inteiro. Os demais (hoje, semana, livre) usam o período de mesma duração
 * logo antes: devolve `undefined`.
 */
export function comparisonRangeFor(
  current: { from: Date; to: Date; preset: PerformancePreset }
): { from: Date; to: Date } | undefined {
  const from = dayKey(current.from);
  const to = dayKey(current.to);
  const days = Math.round((startOfDayMs(to) - startOfDayMs(from)) / (24 * 60 * 60 * 1000)) + 1;

  if (current.preset === "month" || current.preset === "quarter") {
    const step = current.preset === "month" ? 1 : 3;
    const prevFrom = addMonths(from, -step);
    const prevMonthEnd = addDays(from, -1);
    // Mesma quantidade de dias, sem passar do fim do período anterior.
    const prevTo = addDays(prevFrom, days - 1);
    return { from: new Date(startOfDayMs(prevFrom)), to: new Date(endOfDayMs(prevTo > prevMonthEnd ? prevMonthEnd : prevTo)) };
  }

  if (current.preset === "lastquarter") {
    const prevFrom = addMonths(from, -3);
    return { from: new Date(startOfDayMs(prevFrom)), to: new Date(endOfDayMs(addDays(from, -1))) };
  }
  return undefined;
}

/** Os `count` últimos trimestres, do mais antigo ao atual (parcial). */
export function lastQuarters(now: Date, count: number): { label: string; from: Date; to: Date; partial: boolean }[] {
  const today = dayKey(now);
  const currentStart = quarterStart(today);
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const start = addMonths(currentStart, -3 * offset);
    const partial = offset === 0;
    const end = partial ? today : addDays(addMonths(start, 3), -1);
    const q = Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1;
    return {
      label: `T${q} ${start.slice(0, 4)}`,
      from: new Date(startOfDayMs(start)),
      to: new Date(endOfDayMs(end)),
      partial,
    };
  });
}
