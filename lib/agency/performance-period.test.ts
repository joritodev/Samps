import { describe, expect, it } from "vitest";
import { comparisonRangeFor, lastQuarters, resolvePerformanceRange } from "./performance-period";
import { dayKey } from "./sp-calendar";

// 16/08/2026 14:30 em São Paulo.
const now = new Date("2026-08-16T17:30:45.123Z");

const iso = (r: { from: Date; to: Date }) => [r.from.toISOString(), r.to.toISOString()];

describe("resolvePerformanceRange", () => {
  it("padrão: trimestre até o fim de hoje (dias de São Paulo)", () => {
    const r = resolvePerformanceRange({ now });
    expect(r.preset).toBe("quarter");
    expect(iso(r)).toEqual(["2026-07-01T03:00:00.000Z", "2026-08-17T02:59:59.999Z"]);
  });

  it("mês atual quando escolhido", () => {
    const r = resolvePerformanceRange({ preset: "month", now });
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

  it("data inválida cai no trimestre", () => {
    for (const input of [{ from: "2026-02-31", to: "2026-03-02" }, { from: "xx", to: "2026-03-02" }, { from: "2026-03-01" }]) {
      expect(resolvePerformanceRange({ ...input, now }).preset).toBe("quarter");
    }
  });
});

describe("trimestre anterior", () => {
  it("é o trimestre fechado, inclusive na virada de ano", () => {
    const r = resolvePerformanceRange({ preset: "lastquarter", now });
    expect(r.preset).toBe("lastquarter");
    expect([dayKey(r.from), dayKey(r.to)]).toEqual(["2026-04-01", "2026-06-30"]);
    const jan = resolvePerformanceRange({ preset: "lastquarter", now: new Date("2026-02-10T15:00:00Z") });
    expect([dayKey(jan.from), dayKey(jan.to)]).toEqual(["2025-10-01", "2025-12-31"]);
  });
});

describe("comparisonRangeFor", () => {
  const keys = (r?: { from: Date; to: Date }) => (r ? [dayKey(r.from), dayKey(r.to)] : undefined);
  const resolve = (preset: string, iso: string) => {
    const r = resolvePerformanceRange({ preset, now: new Date(iso) });
    return comparisonRangeFor(r);
  };

  it("mês em andamento compara com os mesmos dias do mês anterior", () => {
    expect(keys(resolve("month", "2026-10-02T15:00:00Z"))).toEqual(["2026-09-01", "2026-09-02"]);
    expect(keys(resolve("month", "2026-03-31T15:00:00Z"))).toEqual(["2026-02-01", "2026-02-28"]); // fevereiro é mais curto
    expect(keys(resolve("month", "2026-01-15T15:00:00Z"))).toEqual(["2025-12-01", "2025-12-15"]);
  });
  it("trimestre em andamento compara com os mesmos dias do anterior", () => {
    expect(keys(resolve("quarter", "2026-10-02T15:00:00Z"))).toEqual(["2026-07-01", "2026-07-02"]);
    expect(keys(resolve("quarter", "2026-11-15T15:00:00Z"))).toEqual(["2026-07-01", "2026-08-15"]);
  });
  it("trimestre fechado compara com o trimestre antes dele", () => {
    expect(keys(resolve("lastquarter", "2026-08-16T15:00:00Z"))).toEqual(["2026-01-01", "2026-03-31"]);
  });
  it("hoje, semana e livre usam o padrão (undefined)", () => {
    expect(resolve("today", "2026-10-02T15:00:00Z")).toBeUndefined();
    expect(resolve("week", "2026-10-02T15:00:00Z")).toBeUndefined();
    expect(comparisonRangeFor(resolvePerformanceRange({ from: "2026-09-01", to: "2026-09-10", now }))).toBeUndefined();
  });
});

describe("lastQuarters", () => {
  it("quatro trimestres, o atual parcial até hoje", () => {
    const q = lastQuarters(new Date("2026-11-15T15:00:00Z"), 4);
    expect(q.map((x) => x.label)).toEqual(["T1 2026", "T2 2026", "T3 2026", "T4 2026"]);
    expect(q.map((x) => x.partial)).toEqual([false, false, false, true]);
    expect([dayKey(q[0]!.from), dayKey(q[0]!.to)]).toEqual(["2026-01-01", "2026-03-31"]);
    expect([dayKey(q[3]!.from), dayKey(q[3]!.to)]).toEqual(["2026-10-01", "2026-11-15"]);
  });
  it("atravessa o ano", () => {
    const q = lastQuarters(new Date("2026-02-10T15:00:00Z"), 3);
    expect(q.map((x) => x.label)).toEqual(["T3 2025", "T4 2025", "T1 2026"]);
  });
});
