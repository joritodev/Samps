import { describe, expect, it } from "vitest";
import { capacityFor, isBacklogCard, slotSuggestions, usedHours } from "./capacity";
import type { PlanCapacityOverrideData, PlanDayBlockData } from "./types";

const WEEK = { year: 2026, week: 37 };
const leo = { id: "leo", defaultCapacityHours: 6 };

const override = (o: Partial<PlanCapacityOverrideData>): PlanCapacityOverrideData => ({
  id: "o",
  memberId: "leo",
  weekday: null,
  isoYear: null,
  isoWeek: null,
  hours: 4,
  ...o,
});
const block = (b: Partial<PlanDayBlockData>): PlanDayBlockData => ({
  id: "b",
  isoYear: 2026,
  isoWeek: 37,
  weekday: 3,
  memberId: null,
  reason: "Feriado",
  ...b,
});

describe("capacityFor", () => {
  it("usa a capacidade padrão da pessoa", () => {
    expect(capacityFor(leo, WEEK, 2, [], [])).toBe(6);
  });

  it("ajuste fixo do dia da semana vale para todas as semanas", () => {
    const o = [override({ weekday: 5, hours: 4 })];
    expect(capacityFor(leo, WEEK, 5, o, [])).toBe(4);
    expect(capacityFor(leo, WEEK, 4, o, [])).toBe(6);
  });

  it("ajuste da semana específica vence o fixo", () => {
    const o = [
      override({ weekday: 5, hours: 4 }),
      override({ weekday: 5, isoYear: 2026, isoWeek: 37, hours: 2 }),
    ];
    expect(capacityFor(leo, WEEK, 5, o, [])).toBe(2);
    expect(capacityFor(leo, { year: 2026, week: 38 }, 5, o, [])).toBe(4);
  });

  it("ajuste de outra pessoa não conta", () => {
    expect(capacityFor(leo, WEEK, 5, [override({ memberId: "outra", weekday: 5 })], [])).toBe(6);
  });

  it("bloqueio do setor zera todos; bloqueio de pessoa zera só ela", () => {
    expect(capacityFor(leo, WEEK, 3, [], [block({})])).toBe(0);
    expect(capacityFor(leo, WEEK, 3, [], [block({ memberId: "leo" })])).toBe(0);
    expect(capacityFor(leo, WEEK, 3, [], [block({ memberId: "outra" })])).toBe(6);
    expect(capacityFor(leo, WEEK, 2, [], [block({})])).toBe(6);
  });

  it("bloqueio vence ajuste de capacidade", () => {
    expect(
      capacityFor(leo, WEEK, 3, [override({ weekday: 3, hours: 8 })], [block({})]),
    ).toBe(0);
  });

  it("ausência no dia zera a capacidade (data AAAA-MM-DD)", () => {
    const seen: string[] = [];
    const isAbsent = (id: string, key: string) => {
      seen.push(`${id}@${key}`);
      return id === "leo" && key === "2026-09-09";
    };
    expect(capacityFor(leo, WEEK, 3, [], [], isAbsent)).toBe(0);
    expect(capacityFor(leo, WEEK, 4, [], [], isAbsent)).toBe(6);
    expect(seen).toContain("leo@2026-09-09");
  });
});

describe("usedHours / backlog", () => {
  const cards = [
    { memberId: "leo", weekday: 1, durationHours: 2 },
    { memberId: "leo", weekday: 1, durationHours: 1.5 },
    { memberId: "leo", weekday: 2, durationHours: 3 },
    { memberId: "ana", weekday: 1, durationHours: 4 },
  ];
  it("soma só pessoa e dia pedidos", () => {
    expect(usedHours(cards, "leo", 1)).toBe(3.5);
    expect(usedHours(cards, "ana", 2)).toBe(0);
  });
  it("sem dia ou sem pessoa é backlog", () => {
    expect(isBacklogCard({ weekday: null, memberId: "leo" })).toBe(true);
    expect(isBacklogCard({ weekday: 1, memberId: null })).toBe(true);
    expect(isBacklogCard({ weekday: 1, memberId: "leo" })).toBe(false);
  });
});

describe("slotSuggestions", () => {
  it("sem horas livres não sugere nada", () => {
    expect(slotSuggestions(0)).toEqual([]);
    expect(slotSuggestions(-1)).toEqual([]);
  });
  it("3h livres: no máximo 3 combinações, todas somando 3h", () => {
    const result = slotSuggestions(3);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
    for (const label of result) {
      const total = label.split(" + ").reduce((sum, part) => {
        const m = /^(\d+) de (\d+(?:\.\d+)?)(min|h)$/.exec(part)!;
        const size = m[3] === "min" ? Number(m[2]) / 60 : Number(m[2]);
        return sum + Number(m[1]) * size;
      }, 0);
      expect(total).toBeCloseTo(3, 5);
    }
  });
  it("começa pelas peças maiores: poucas entregas, não dezenas de peças curtas", () => {
    expect(slotSuggestions(3)[0]).toBe("1 de 3h");
    expect(slotSuggestions(3)).toContain("1 de 2h + 1 de 1h");
    // presets curtos do Design: a primeira sugestão usa a peça maior que cabe
    const design = [5 / 60, 0.25, 0.5, 1.5, 2.5];
    expect(slotSuggestions(6, design)[0]).toMatch(/^2 de 2\.5h/);
    expect(slotSuggestions(6, design)[0]).toMatch(/^2 de 2\.5h/);
  });

  it("respeita os presets informados", () => {
    expect(slotSuggestions(2, [1])).toEqual(["2 de 1h"]);
  });
  it("30 minutos aparece em min", () => {
    expect(slotSuggestions(0.5)).toEqual(["1 de 30min"]);
  });
});
