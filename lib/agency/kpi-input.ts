import { KPI_CATALOG, type KpiKey } from "@/lib/agency/performance-summary";

/** Valor de um indicador no campo do formulário: percentual em 0–100, o resto como está. */
export function kpiToField(metric: KpiKey, value: number): string {
  const shown = KPI_CATALOG[metric].unit === "percent" ? value * 100 : value;
  return String(Math.round(shown * 100) / 100);
}

export function kpiFromField(metric: KpiKey, text: string): number {
  const value = Number(text.replace(",", "."));
  return KPI_CATALOG[metric].unit === "percent" ? value / 100 : value;
}
