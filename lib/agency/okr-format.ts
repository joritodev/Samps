import { formatKpiValue } from "@/lib/agency/performance-format";
import { KPI_CATALOG, type KpiKey } from "@/lib/agency/performance-summary";

/** "clientes" → "cliente" para valor 1. Só mexe em unidade de uma palavra. */
export function singular(unit: string): string {
  if (/\s/.test(unit) || unit.length < 4 || !unit.endsWith("s")) return unit;
  if (unit.endsWith("ões")) return `${unit.slice(0, -3)}ão`;
  if (unit.endsWith("ais")) return `${unit.slice(0, -3)}al`;
  if (unit.endsWith("ns")) return `${unit.slice(0, -2)}m`;
  return unit.slice(0, -1);
}

type KrLike = { kind: "KPI" | "MANUAL"; metric: KpiKey | null; unit: string | null };

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Valor de um resultado-chave: indicador formatado ou número com a unidade. */
export function formatKrValue(kr: KrLike, value: number | null): string {
  if (value === null) return "—";
  if (kr.kind === "KPI" && kr.metric) return formatKpiValue(value, KPI_CATALOG[kr.metric].unit);
  return `${NUMBER.format(value)}${kr.unit ? ` ${Math.abs(value) === 1 ? singular(kr.unit) : kr.unit}` : ""}`;
}

/** "70% → 90%" */
export function formatKrRange(kr: KrLike & { startValue: number; targetValue: number }): string {
  return `${formatKrValue(kr, kr.startValue)} → ${formatKrValue(kr, kr.targetValue)}`;
}

export function formatProgress(progress: number | null): string {
  return progress === null ? "—" : `${Math.round(progress * 100)}%`;
}
