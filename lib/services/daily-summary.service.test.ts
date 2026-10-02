import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  reportSeen: { findUnique: vi.fn(), upsert: vi.fn() },
  demand: { count: vi.fn() },
}));
const listLedSectorIds = vi.hoisted(() => vi.fn());
const getPerformanceSummary = vi.hoisted(() => vi.fn());
const listGoalsForUser = vi.hoisted(() => vi.fn());
const evaluateGoals = vi.hoisted(() => vi.fn());
const listObjectivesForUser = vi.hoisted(() => vi.fn());
const evaluateObjectives = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions/led-sectors", () => ({ listLedSectorIds }));
vi.mock("@/lib/services/performance-summary.service", () => ({ getPerformanceSummary }));
vi.mock("@/lib/services/goals.service", () => ({ listGoalsForUser, evaluateGoals }));
vi.mock("@/lib/services/okr.service", () => ({ listObjectivesForUser, evaluateObjectives }));

import { dismissDailySummary, getDailySummaryForModal } from "./daily-summary.service";

const designer = { id: "d1", name: "Ana Carolina", userType: "DESIGNER", sectorId: "s1", permissions: [] } as unknown as SessionUser;
const client = { id: "c1", name: "Cli", userType: "EXTERNAL_CLIENT", sectorId: null, permissions: [] } as unknown as SessionUser;
const now = new Date("2026-10-07T12:00:00Z"); // quarta, 09h em SP

function summary(over: Record<string, { value: number | null; previous?: number | null }> = {}) {
  const base = {
    COMPLETED: { value: 0, previous: 0 }, ON_TIME_RATE: { value: null }, WORKED_HOURS: { value: 0 },
    OVERDUE: { value: 0 }, ADJUSTMENTS: { value: 0 },
  };
  return { indicators: { ...base, ...over } };
}

beforeEach(() => {
  vi.clearAllMocks();
  listLedSectorIds.mockResolvedValue([]);
  db.reportSeen.findUnique.mockResolvedValue(null);
  db.demand.count.mockResolvedValue(0);
  getPerformanceSummary.mockResolvedValue(summary());
  listGoalsForUser.mockResolvedValue([]);
  evaluateGoals.mockResolvedValue([]);
  listObjectivesForUser.mockResolvedValue([]);
  evaluateObjectives.mockResolvedValue([]);
});

describe("getDailySummaryForModal: quem vê", () => {
  it("cliente externo, líder e gestão não veem", async () => {
    expect(await getDailySummaryForModal(client, now)).toBeNull();
    listLedSectorIds.mockResolvedValue(["s1"]);
    expect(await getDailySummaryForModal(designer, now)).toBeNull();
    listLedSectorIds.mockResolvedValue([]);
    expect(await getDailySummaryForModal({ ...designer, userType: "MANAGEMENT" } as SessionUser, now)).toBeNull();
    expect(getPerformanceSummary).not.toHaveBeenCalled();
  });
  it("quem já viu hoje não vê de novo, e não calcula nada", async () => {
    db.reportSeen.findUnique.mockResolvedValue({ id: "x" });
    expect(await getDailySummaryForModal(designer, now)).toBeNull();
    expect(db.reportSeen.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_day: { userId: "d1", day: "2026-10-07" } } }));
    expect(getPerformanceSummary).not.toHaveBeenCalled();
  });
  it("sem nada a dizer não mostra", async () => {
    expect(await getDailySummaryForModal(designer, now)).toBeNull();
  });
});

describe("getDailySummaryForModal: conteúdo", () => {
  it("resume o dia útil anterior só da pessoa", async () => {
    getPerformanceSummary.mockResolvedValue(summary({ COMPLETED: { value: 4, previous: 2 }, ON_TIME_RATE: { value: 1 }, WORKED_HOURS: { value: 5.2 }, OVERDUE: { value: 1 }, ADJUSTMENTS: { value: 1 } }));
    db.demand.count.mockResolvedValue(2);
    const content = await getDailySummaryForModal(designer, now);
    const call = getPerformanceSummary.mock.calls[0][0];
    expect(call.scope).toEqual({ userId: "d1" });
    expect(call.range.from.toISOString()).toBe("2026-10-06T03:00:00.000Z");
    expect(content).toMatchObject({
      greeting: "Bom dia, Ana!", dayLabel: "ontem", completed: 4, onTimeRate: 1, workedHours: 5.2, dueToday: 2, overdue: 1, adjustments: 1,
    });
    expect(content?.title).toContain("4 entregas ontem");
    const where = db.demand.count.mock.calls[0][0].where;
    expect(where).toMatchObject({ assigneeId: "d1", isChecklistItem: false });
    expect(where.dueDate.gte.toISOString()).toBe("2026-10-07T03:00:00.000Z");
  });
  it("na segunda fala da sexta", async () => {
    getPerformanceSummary.mockResolvedValue(summary({ COMPLETED: { value: 1, previous: 0 } }));
    const content = await getDailySummaryForModal(designer, new Date("2026-10-05T12:00:00Z"));
    expect(content?.dayLabel).toBe("na sexta");
    expect(getPerformanceSummary.mock.calls[0][0].range.from.toISOString()).toBe("2026-10-02T03:00:00.000Z");
  });
  it("só metas e objetivos já bastam para mostrar", async () => {
    evaluateGoals.mockResolvedValue([{ id: "g" }]);
    expect(await getDailySummaryForModal(designer, now)).not.toBeNull();
  });
  it("metas: as dela, as do setor dela e as da agência, nessa ordem, até 3", async () => {
    const g = (id: string, scope: string, extra: object = {}) => ({
      id, scope, sectorId: null, userId: null, startsOn: new Date("2026-10-01"), endsOn: new Date("2026-12-31"), ...extra,
    });
    listGoalsForUser.mockResolvedValue([
      g("ag", "AGENCY"), g("sec-outro", "SECTOR", { sectorId: "s9" }), g("sec", "SECTOR", { sectorId: "s1" }),
      g("eu", "USER", { userId: "d1" }), g("outro", "USER", { userId: "z" }), g("velha", "AGENCY", { endsOn: new Date("2026-09-30") }),
    ]);
    await getDailySummaryForModal(designer, now);
    expect(evaluateGoals.mock.calls[0][0].map((x: { id: string }) => x.id)).toEqual(["eu", "sec", "ag"]);
  });
  it("objetivos: só os ativos de que é dona, até 2", async () => {
    const o = (id: string, ownerId: string, status = "ACTIVE") => ({ id, ownerId, status });
    listObjectivesForUser.mockResolvedValue([o("a", "d1"), o("b", "z"), o("c", "d1", "DONE"), o("d", "d1"), o("e", "d1")]);
    await getDailySummaryForModal(designer, now);
    expect(evaluateObjectives.mock.calls[0][0].map((x: { id: string }) => x.id)).toEqual(["a", "d"]);
  });
});

describe("dismissDailySummary", () => {
  it("grava o dia de hoje em SP para a própria pessoa, de forma idempotente", async () => {
    await dismissDailySummary(designer, new Date("2026-10-07T01:00:00Z"));
    expect(db.reportSeen.upsert).toHaveBeenCalledWith({
      where: { userId_day: { userId: "d1", day: "2026-10-06" } },
      create: { userId: "d1", day: "2026-10-06" },
      update: {},
    });
  });
  it("cliente externo não grava", async () => {
    await expect(dismissDailySummary(client, now)).rejects.toThrow();
    expect(db.reportSeen.upsert).not.toHaveBeenCalled();
  });
});
