import { describe, expect, it } from "vitest";
import {
  KPI_CATALOG,
  buildHeadline,
  buildPerformanceSummary,
  compareValue,
  resolveComparisonRanges,
  type DeliveryRow,
  type Snapshot,
} from "./performance-summary";

const SNAP: Snapshot = { overdue: 0, adjustments: 0, unassignedOpen: 0, overdueBySector: [] };

function row(over: Partial<Omit<DeliveryRow, "completedAt">> & { completedAt: string }): DeliveryRow {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date("2026-09-01T12:00:00Z"),
    dueDate: null,
    assignee: { id: "u1", name: "Ana" },
    contentType: { id: "t1", name: "Reel" },
    hadRework: false,
    activeSeconds: 3600,
    ...over,
    completedAt: new Date(over.completedAt),
  };
}

import { dayKey } from "./sp-calendar";

describe("dayKey", () => {
  it("usa o dia de São Paulo", () => {
    expect(dayKey(new Date("2026-10-02T02:59:00Z"))).toBe("2026-10-01");
    expect(dayKey(new Date("2026-10-02T03:00:00Z"))).toBe("2026-10-02");
  });
});

describe("resolveComparisonRanges", () => {
  it("alinha a dias de SP e põe o período anterior logo antes", () => {
    const { current, previous, days } = resolveComparisonRanges({
      from: new Date("2026-10-05T10:00:00Z"),
      to: new Date("2026-10-11T10:00:00Z"),
    });
    expect(days).toBe(7);
    expect(current.from.toISOString()).toBe("2026-10-05T03:00:00.000Z");
    expect(current.to.toISOString()).toBe("2026-10-12T02:59:59.999Z");
    expect(previous.from.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(previous.to.toISOString()).toBe("2026-10-05T02:59:59.999Z");
  });

  it("atravessa a virada de ano", () => {
    const { previous } = resolveComparisonRanges({
      from: new Date("2026-01-01T12:00:00Z"),
      to: new Date("2026-01-03T12:00:00Z"),
    });
    expect(previous.from.toISOString()).toBe("2025-12-29T03:00:00.000Z");
  });

  it("um único dia compara com o dia anterior", () => {
    const { days, previous } = resolveComparisonRanges({
      from: new Date("2026-10-02T15:00:00Z"),
      to: new Date("2026-10-02T20:00:00Z"),
    });
    expect(days).toBe(1);
    expect(previous.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
});

describe("compareValue", () => {
  it("entende a direção de cada indicador", () => {
    expect(compareValue(8, 7, "higher").trend).toBe("better");
    expect(compareValue(9, 6, "lower").trend).toBe("worse");
    expect(compareValue(3, 3, "lower").trend).toBe("same");
  });
  it("arredonda o percentual e ignora base zero", () => {
    expect(compareValue(8, 7, "higher").deltaPct).toBe(14);
    expect(compareValue(5, 0, "higher").deltaPct).toBeNull();
  });
  it("razões não têm percentual relativo", () => {
    const c = compareValue(0.75, 0.66, "higher", "percent");
    expect(c.deltaPct).toBeNull();
    expect(c.delta).toBeCloseTo(0.09);
  });
  it("sem dado não compara", () => {
    expect(compareValue(null, 1, "higher").trend).toBe("none");
    expect(compareValue(1, null, "higher").trend).toBe("none");
  });
});

describe("buildPerformanceSummary", () => {
  const range = {
    from: new Date("2026-10-05T12:00:00Z"),
    to: new Date("2026-10-11T12:00:00Z"),
  };

  it("calcula indicadores, comparação e série diária", () => {
    const rows = [
      row({ completedAt: "2026-10-06T15:00:00Z", dueDate: new Date("2026-10-07T00:00:00Z") }),
      row({ completedAt: "2026-10-06T16:00:00Z", dueDate: new Date("2026-10-06T00:00:00Z"), hadRework: true }),
      row({ completedAt: "2026-10-08T15:00:00Z", assignee: { id: "u2", name: "Bia" } }),
      row({ completedAt: "2026-09-30T15:00:00Z", dueDate: new Date("2026-10-01T00:00:00Z") }),
    ];
    const s = buildPerformanceSummary({
      range,
      rows,
      workedSeconds: { current: 7200, previous: 3600 },
      snapshot: { ...SNAP, overdue: 2, unassignedOpen: 1 },
    });
    const i = s.indicators;
    expect(i.COMPLETED).toMatchObject({ value: 3, previous: 1, trend: "better", deltaPct: 200 });
    expect(i.ON_TIME_RATE.value).toBeCloseTo(0.5);
    expect(i.ON_TIME_RATE.previous).toBe(1);
    expect(i.ON_TIME_RATE.trend).toBe("worse");
    expect(i.REWORK_RATE.value).toBeCloseTo(1 / 3);
    expect(i.WORKED_HOURS).toMatchObject({ value: 2, previous: 1 });
    expect(i.OVERDUE).toMatchObject({ value: 2, previous: null, trend: "none" });
    expect(s.series).toHaveLength(7);
    expect(s.series.find((p) => p.date === "2026-10-06")?.current).toBe(2);
    expect(s.series.find((p) => p.date === "2026-10-07")?.previous).toBe(1);
    expect(s.topDeliverers.map((d) => d.name)).toEqual(["Ana", "Bia"]);
    expect(s.smallSample).toBe(false);
  });

  it("marca amostra pequena e não inventa tipo mais lento", () => {
    const s = buildPerformanceSummary({
      range,
      rows: [row({ completedAt: "2026-10-06T15:00:00Z" })],
      workedSeconds: { current: 0, previous: 0 },
      snapshot: SNAP,
    });
    expect(s.smallSample).toBe(true);
    expect(s.slowestType).toBeNull();
  });

  it("acha o tipo mais lento com amostra suficiente", () => {
    const slow = (n: number) =>
      Array.from({ length: n }, () =>
        row({ completedAt: "2026-10-06T15:00:00Z", contentType: { id: "t2", name: "Vídeo" }, activeSeconds: 7200 })
      );
    const s = buildPerformanceSummary({
      range,
      rows: [...slow(3), row({ completedAt: "2026-10-06T15:00:00Z" })],
      workedSeconds: { current: 0, previous: 0 },
      snapshot: SNAP,
    });
    expect(s.slowestType).toMatchObject({ name: "Vídeo", n: 3 });
  });

  it("sem entregas: razões ficam nulas", () => {
    const s = buildPerformanceSummary({ range, rows: [], workedSeconds: { current: 0, previous: 0 }, snapshot: SNAP });
    expect(s.indicators.ON_TIME_RATE.value).toBeNull();
    expect(s.indicators.REWORK_RATE.value).toBeNull();
    expect(s.indicators.AVG_LEAD_TIME_DAYS.value).toBeNull();
    expect(s.headline).toBe("Nenhuma entrega no período nem no anterior.");
  });
});

describe("buildHeadline", () => {
  const base = (done: number, prev: number, overdue = 0, unassigned = 0, sectors: Snapshot["overdueBySector"] = []) => {
    const s = buildPerformanceSummary({
      range: { from: new Date("2026-10-05T12:00:00Z"), to: new Date("2026-10-05T12:00:00Z") },
      rows: [
        ...Array.from({ length: done }, () => row({ completedAt: "2026-10-05T15:00:00Z" })),
        ...Array.from({ length: prev }, () => row({ completedAt: "2026-10-04T15:00:00Z" })),
      ],
      workedSeconds: { current: 0, previous: 0 },
      snapshot: { overdue, adjustments: 0, unassignedOpen: unassigned, overdueBySector: sectors },
    });
    return buildHeadline(s);
  };

  it("melhor, pior e igual", () => {
    expect(base(8, 4)).toBe("Entregas 100% acima do período anterior (8 contra 4).");
    expect(base(2, 4)).toBe("Entregas 50% abaixo do período anterior (2 contra 4).");
    expect(base(3, 3)).toBe("Mesmo ritmo do período anterior (3 entregas).");
  });
  it("sem base no período anterior", () => {
    expect(base(2, 0)).toBe("2 entregas no período, sem entregas no anterior.");
  });
  it("cita atraso, setor e sem responsável", () => {
    expect(
      base(3, 3, 9, 2, [
        { sectorId: "a", name: "Design", count: 5 },
        { sectorId: "b", name: "Social", count: 4 },
      ])
    ).toBe("Mesmo ritmo do período anterior (3 entregas). 9 atrasadas, 5 em Design. 2 demandas sem responsável.");
    expect(base(3, 3, 1, 1)).toBe("Mesmo ritmo do período anterior (3 entregas). 1 atrasada. 1 demanda sem responsável.");
  });
});

describe("catálogo", () => {
  it("indicadores instantâneos não comparam com o período anterior", () => {
    const snapshots = Object.entries(KPI_CATALOG).filter(([, m]) => m.snapshot).map(([k]) => k);
    expect(snapshots.sort()).toEqual(["ADJUSTMENTS", "OVERDUE", "UNASSIGNED_OPEN"]);
  });
});
