import { describe, expect, it } from "vitest";
import { formatComparison, formatDuration, formatKpiValue, shortDay, weekdayShort } from "./performance-format";
import { compareValue, KPI_CATALOG, type KpiKey, type KpiResult } from "./performance-summary";

function kpi(key: KpiKey, value: number | null, previous: number | null): KpiResult {
  const meta = KPI_CATALOG[key];
  const base = meta.snapshot ? null : previous;
  return { key, ...meta, value, previous: base, ...compareValue(value, base, meta.direction, meta.unit) };
}

describe("formatKpiValue", () => {
  it("formata por unidade", () => {
    expect(formatKpiValue(8, "count")).toBe("8");
    expect(formatKpiValue(0.756, "percent")).toBe("76%");
    expect(formatKpiValue(14.34, "hours")).toBe("14,3 h");
    expect(formatKpiValue(4.43, "days")).toBe("4,4 dias");
    expect(formatKpiValue(1, "days")).toBe("1 dia");
    expect(formatKpiValue(null, "percent")).toBe("—");
  });
});

describe("formatComparison", () => {
  it("contagem com percentual", () => {
    expect(formatComparison(kpi("COMPLETED", 8, 7))).toEqual({ text: "14% a mais que antes (7)", trend: "better" });
    expect(formatComparison(kpi("COMPLETED", 5, 10))).toEqual({ text: "50% a menos que antes (10)", trend: "worse" });
  });
  it("razão em pontos", () => {
    expect(formatComparison(kpi("ON_TIME_RATE", 0.75, 0.66)).text).toBe("9 pontos a mais que antes (66%)");
  });
  it("base zero mostra a diferença absoluta", () => {
    expect(formatComparison(kpi("COMPLETED", 3, 0)).text).toBe("3 a mais que antes (0)");
  });
  it("igual, sem base e instantâneo", () => {
    expect(formatComparison(kpi("COMPLETED", 3, 3))).toEqual({ text: "igual ao anterior (3)", trend: "same" });
    expect(formatComparison(kpi("ON_TIME_RATE", null, 0.5)).trend).toBe("none");
    expect(formatComparison(kpi("OVERDUE", 9, null))).toEqual({ text: "agora", trend: "none" });
  });
  it("menos atraso é melhor, mais retrabalho é pior", () => {
    expect(formatComparison(kpi("REWORK_RATE", 0.3, 0.1)).trend).toBe("worse");
    expect(formatComparison(kpi("AVG_LEAD_TIME_DAYS", 50, 100)).trend).toBe("better");
  });
});

describe("tempo e datas", () => {
  it("duração", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(1800)).toBe("30 min");
    expect(formatDuration(7200)).toBe("2 h");
  });
  it("dia curto e dia da semana", () => {
    expect(shortDay("2026-10-02")).toBe("02/10");
    expect(weekdayShort("2026-10-02")).toBe("sex");
  });
});
