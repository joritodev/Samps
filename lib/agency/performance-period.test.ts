import { describe, expect, it } from "vitest";
import { resolvePerformanceRange } from "./performance-period";

// 16/08/2026 14:30 em São Paulo.
const now = new Date("2026-08-16T17:30:45.123Z");

const iso = (r: { from: Date; to: Date }) => [r.from.toISOString(), r.to.toISOString()];

describe("resolvePerformanceRange", () => {
  it("padrão: mês atual até o fim de hoje (dias de São Paulo)", () => {
    const r = resolvePerformanceRange({ now });
    expect(r.preset).toBe("month");
    expect(iso(r)).toEqual(["2026-08-01T03:00:00.000Z", "2026-08-17T02:59:59.999Z"]);
  });

  it("hoje", () => {
    const r = resolvePerformanceRange({ preset: "today", now });
    expect(r.preset).toBe("today");
    expect(iso(r)).toEqual(["2026-08-16T03:00:00.000Z", "2026-08-17T02:59:59.999Z"]);
  });

  it("depois das 21h em SP ainda é o mesmo dia (já é o dia seguinte em UTC)", () => {
    const late = new Date("2026-08-17T01:00:00Z");
    const r = resolvePerformanceRange({ preset: "today", now: late });
    expect(r.from.toISOString()).toBe("2026-08-16T03:00:00.000Z");
  });

  it("semana: hoje e os seis dias anteriores", () => {
    const r = resolvePerformanceRange({ preset: "week", now });
    expect(r.preset).toBe("week");
    expect(iso(r)).toEqual(["2026-08-10T03:00:00.000Z", "2026-08-17T02:59:59.999Z"]);
  });

  it("trimestre: do primeiro dia do trimestre até hoje", () => {
    const r = resolvePerformanceRange({ preset: "quarter", now });
    expect(r.preset).toBe("quarter");
    expect(r.from.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    const q1 = resolvePerformanceRange({ preset: "quarter", now: new Date("2026-03-31T15:00:00Z") });
    expect(q1.from.toISOString()).toBe("2026-01-01T03:00:00.000Z");
    const q4 = resolvePerformanceRange({ preset: "quarter", now: new Date("2026-12-31T15:00:00Z") });
    expect(q4.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("datas livres válidas valem sempre, inclusive nas pontas", () => {
    const r = resolvePerformanceRange({ preset: "today", from: "2026-07-30", to: "2026-08-02", now });
    expect(r.preset).toBe("custom");
    expect(iso(r)).toEqual(["2026-07-30T03:00:00.000Z", "2026-08-03T02:59:59.999Z"]);
  });

  it("troca datas invertidas", () => {
    const r = resolvePerformanceRange({ from: "2026-08-10", to: "2026-08-01", now });
    expect(iso(r)).toEqual(["2026-08-01T03:00:00.000Z", "2026-08-11T02:59:59.999Z"]);
  });

  it("data inválida cai no mês atual", () => {
    for (const input of [{ from: "2026-02-31", to: "2026-03-02" }, { from: "xx", to: "2026-03-02" }, { from: "2026-03-01" }]) {
      expect(resolvePerformanceRange({ ...input, now }).preset).toBe("month");
    }
  });
});
