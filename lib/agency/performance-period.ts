import {
  addDays,
  dayKey,
  endOfDayMs,
  isValidDayKey,
  startOfDayMs,
} from "@/lib/agency/sp-calendar";

export type PerformancePreset = "today" | "week" | "month" | "quarter" | "custom";

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

  if (input.preset === "quarter") {
    const month = Number(today.slice(5, 7));
    const first = String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0");
    return range(`${today.slice(0, 4)}-${first}-01`, today, "quarter");
  }

  return range(`${today.slice(0, 7)}-01`, today, "month");
}
