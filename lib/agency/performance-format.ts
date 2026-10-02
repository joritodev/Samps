import type { KpiResult, KpiUnit, Trend } from "@/lib/agency/performance-summary";

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatKpiValue(value: number | null, unit: KpiUnit): string {
  if (value === null) return "—";
  if (unit === "percent") return `${Math.round(value * 100)}%`;
  if (unit === "hours") return `${NUMBER.format(value)} h`;
  if (unit === "days") return `${NUMBER.format(value)} ${value === 1 ? "dia" : "dias"}`;
  return String(Math.round(value));
}

export type ComparisonText = {
  /** Frase curta, ex.: "18% a mais que antes (7)". Vazia se não compara. */
  text: string;
  trend: Trend;
};

/** Texto da variação de um indicador contra o período anterior. */
export function formatComparison(kpi: KpiResult): ComparisonText {
  if (kpi.snapshot) return { text: "agora", trend: "none" };
  if (kpi.trend === "none" || kpi.delta === null) {
    return { text: "sem base no período anterior", trend: "none" };
  }
  const before = formatKpiValue(kpi.previous, kpi.unit);
  if (kpi.trend === "same") return { text: `igual ao anterior (${before})`, trend: "same" };

  const more = kpi.delta > 0;
  let amount: string;
  if (kpi.unit === "percent") amount = `${Math.round(Math.abs(kpi.delta) * 100)} pontos`;
  else if (kpi.deltaPct !== null) amount = `${Math.abs(kpi.deltaPct)}%`;
  else amount = formatKpiValue(Math.abs(kpi.delta), kpi.unit);
  return {
    text: `${amount} ${more ? "a mais" : "a menos"} que antes (${before})`,
    trend: kpi.trend,
  };
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${NUMBER.format(seconds / 3600)} h`;
}

/** `02/10` a partir de `2026-10-02`. */
export function shortDay(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function weekdayShort(key: string): string {
  return WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()]!;
}
