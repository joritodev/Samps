import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  demand: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  workSession: { aggregate: vi.fn() },
  sector: { findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));

import {
  demandScopeWhere,
  getPerformanceSummary,
  toDeliveryRows,
} from "./performance-summary.service";

const range = {
  from: new Date("2026-10-05T12:00:00Z"),
  to: new Date("2026-10-11T12:00:00Z"),
};
const now = new Date("2026-10-11T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  db.demand.findMany.mockResolvedValue([]);
  db.demand.count.mockResolvedValue(0);
  db.demand.groupBy.mockResolvedValue([]);
  db.workSession.aggregate.mockResolvedValue({ _sum: { totalActiveSeconds: null } });
  db.sector.findMany.mockResolvedValue([]);
});

describe("demandScopeWhere", () => {
  it("agência inteira só exclui itens de checklist", () => {
    expect(demandScopeWhere({})).toEqual({ isChecklistItem: false });
  });
  it("combina setor, cliente e pessoa", () => {
    expect(demandScopeWhere({ sectorId: "s", clientId: "c", userId: "u" })).toEqual({
      isChecklistItem: false,
      sectorId: "s",
      clientId: "c",
      assigneeId: "u",
    });
  });
});

describe("toDeliveryRows", () => {
  it("descarta sem conclusão e detecta retrabalho e tempo", () => {
    const base = {
      id: "d",
      createdAt: new Date("2026-10-01T00:00:00Z"),
      dueDate: null,
      assignee: null,
      contentType: null,
    };
    const rows = toDeliveryRows([
      { ...base, productionCompletedAt: null, workSessions: [] },
      {
        ...base,
        productionCompletedAt: new Date("2026-10-06T00:00:00Z"),
        workSessions: [
          { stage: "PRODUCTION", totalActiveSeconds: 100 },
          { stage: "ADJUSTMENT", totalActiveSeconds: 50 },
        ],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ hadRework: true, activeSeconds: 150 });
  });
});

describe("getPerformanceSummary", () => {
  it("busca as entregas dos dois períodos de uma vez, no recorte pedido", async () => {
    await getPerformanceSummary({ scope: { sectorId: "s1" }, range, now });
    const where = db.demand.findMany.mock.calls[0][0].where;
    expect(where.sectorId).toBe("s1");
    expect(where.productionCompletedAt.gte.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(where.productionCompletedAt.lte.toISOString()).toBe("2026-10-12T02:59:59.999Z");
  });

  it("tempo trabalhado de pessoa filtra por usuário, de setor pela demanda", async () => {
    await getPerformanceSummary({ scope: { userId: "u1" }, range, now });
    expect(db.workSession.aggregate.mock.calls[0][0].where).toMatchObject({ userId: "u1" });
    expect(db.workSession.aggregate.mock.calls[0][0].where.demand).toBeUndefined();

    db.workSession.aggregate.mockClear();
    await getPerformanceSummary({ scope: { sectorId: "s1" }, range, now });
    const where = db.workSession.aggregate.mock.calls[0][0].where;
    expect(where.userId).toBeUndefined();
    expect(where.demand).toEqual({ isChecklistItem: false, sectorId: "s1" });
  });

  it("no recorte de uma pessoa não conta sem responsável", async () => {
    db.demand.count.mockResolvedValue(4);
    const s = await getPerformanceSummary({ scope: { userId: "u1" }, range, now });
    expect(s.indicators.UNASSIGNED_OPEN.value).toBe(0);
    expect(s.indicators.OVERDUE.value).toBe(4);
  });

  it("nomeia o setor das atrasadas", async () => {
    db.demand.count.mockResolvedValue(5);
    db.demand.groupBy.mockResolvedValue([
      { sectorId: "s1", _count: { _all: 3 } },
      { sectorId: null, _count: { _all: 2 } },
    ]);
    db.sector.findMany.mockResolvedValue([{ id: "s1", name: "Design" }]);
    const s = await getPerformanceSummary({ range, now });
    expect(s.overdueBySector).toEqual([
      { sectorId: "s1", name: "Design", count: 3 },
      { sectorId: null, name: "Sem setor", count: 2 },
    ]);
    expect(s.headline).toContain("5 atrasadas, 3 em Design");
  });

  it("atrasadas usam só abertas com prazo vencido", async () => {
    await getPerformanceSummary({ range, now });
    const overdueCall = db.demand.count.mock.calls.find((c) => c[0].where.dueDate)?.[0];
    expect(overdueCall.where.dueDate).toEqual({ lt: now });
    expect(overdueCall.where.status.notIn).toContain("DONE");
  });
});
