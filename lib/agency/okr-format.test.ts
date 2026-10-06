import { describe, expect, it } from "vitest";
import { formatKrRange, formatKrValue, formatProgress, singular } from "./okr-format";

describe("okr-format", () => {
  it("indicador usa a unidade do catálogo", () => {
    const kr = { kind: "KPI" as const, metric: "ON_TIME_RATE" as const, unit: null };
    expect(formatKrValue(kr, 0.9)).toBe("90%");
    expect(formatKrRange({ ...kr, startValue: 0.7, targetValue: 0.9 })).toBe("70% → 90%");
  });
  it("manual usa o número e a unidade em texto", () => {
    const kr = { kind: "MANUAL" as const, metric: null, unit: "clientes" };
    expect(formatKrValue(kr, 2.5)).toBe("2,5 clientes");
    expect(formatKrValue({ ...kr, unit: null }, 3)).toBe("3");
    expect(formatKrValue(kr, null)).toBe("—");
  });
  it("valor 1 usa a unidade no singular", () => {
    const kr = { kind: "MANUAL" as const, metric: null, unit: "clientes" };
    expect(formatKrValue(kr, 1)).toBe("1 cliente");
    expect(formatKrValue(kr, 0)).toBe("0 clientes");
    expect(singular("reuniões")).toBe("reunião");
    expect(singular("captações")).toBe("captação");
    expect(singular("reels")).toBe("reel");
    expect(singular("vendas por mês")).toBe("vendas por mês");
  });
  it("progresso", () => {
    expect(formatProgress(0.456)).toBe("46%");
    expect(formatProgress(null)).toBe("—");
  });
});
