import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  goal: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  notification: { findFirst: vi.fn() },
}));
const evaluateGoals = vi.hoisted(() => vi.fn());
const createNotification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/goals.service", () => ({ evaluateGoals }));
vi.mock("@/lib/services/notifications.service", () => ({ createNotification }));

import { runGoalCelebrations } from "./celebrations.service";

const now = new Date("2027-01-01T12:00:00Z");

function goal(over: Record<string, unknown> = {}) {
  return {
    id: "g1", metric: "ON_TIME_RATE", scope: "AGENCY", sectorId: null, userId: null, target: 0.85, warnMargin: 0.1,
    startsOn: new Date("2026-10-01T03:00:00Z"), endsOn: new Date("2026-12-31T23:59:59Z"), active: true,
    sector: null, user: null, ...over,
  };
}
const view = (g: ReturnType<typeof goal>, over: Record<string, unknown> = {}) => ({
  id: g.id, metric: g.metric, scope: g.scope, sectorName: g.sector ? "Design" : null, userName: g.user ? "Ana" : null,
  target: g.target, actual: 0.9, status: "met", ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.goal.findMany.mockResolvedValue([]);
  db.user.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
  db.notification.findFirst.mockResolvedValue(null);
  createNotification.mockResolvedValue({ id: "n" });
  evaluateGoals.mockImplementation(async (rows: ReturnType<typeof goal>[]) => rows.map((g) => view(g)));
});

describe("runGoalCelebrations", () => {
  it("sem metas fechando não faz nada", async () => {
    expect(await runGoalCelebrations(now)).toEqual({ considered: 0, celebrated: 0, notified: 0, duplicates: 0 });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it("busca só metas ativas que acabaram nos últimos 2 dias", async () => {
    await runGoalCelebrations(now);
    const where = db.goal.findMany.mock.calls[0][0].where;
    expect(where.active).toBe(true);
    expect(where.endsOn.lte).toEqual(now);
    expect(where.endsOn.gte.toISOString()).toBe("2026-12-30T12:00:00.000Z");
  });
  it("meta da agência batida avisa a gestão", async () => {
    db.goal.findMany.mockResolvedValue([goal()]);
    const r = await runGoalCelebrations(now);
    expect(r).toMatchObject({ considered: 1, celebrated: 1, notified: 2 });
    const call = createNotification.mock.calls[0][0];
    expect(call).toMatchObject({ type: "OTHER", link: "/performance/metas" });
    expect(call.title).toBe("Meta batida: No prazo (Agência, 01/10 a 31/12)");
    expect(call.message).toBe("Alvo ≥ 85%; resultado 90%. Parabéns!");
  });
  it("meta de setor avisa também o líder; meta de pessoa, a própria pessoa", async () => {
    db.goal.findMany.mockResolvedValue([
      goal({ id: "s", scope: "SECTOR", sectorId: "s1", sector: { name: "Design", leaderId: "l1" } }),
      goal({ id: "u", scope: "USER", userId: "u1", user: { name: "Ana" } }),
    ]);
    await runGoalCelebrations(now);
    const to = (id: string) => createNotification.mock.calls.filter((c) => c[0].title.includes(id === "s" ? "Design" : "Ana")).map((c) => c[0].userId).sort();
    expect(to("s")).toEqual(["l1", "m1", "m2"]);
    expect(to("u")).toEqual(["m1", "m2", "u1"]);
  });
  it("só celebra o que bateu a meta", async () => {
    db.goal.findMany.mockResolvedValue([goal()]);
    for (const status of ["near", "off", "none"]) {
      evaluateGoals.mockImplementation(async (rows: ReturnType<typeof goal>[]) => rows.map((g) => view(g, { status })));
      expect((await runGoalCelebrations(now)).celebrated).toBe(0);
    }
    expect(createNotification).not.toHaveBeenCalled();
  });
  it("não repete o aviso para a mesma pessoa", async () => {
    db.goal.findMany.mockResolvedValue([goal()]);
    db.notification.findFirst.mockResolvedValueOnce({ id: "x" }).mockResolvedValue(null);
    const r = await runGoalCelebrations(now);
    expect(r).toMatchObject({ notified: 1, duplicates: 1 });
  });
  it("preferência desligada (createNotification devolve null) não conta como enviado", async () => {
    db.goal.findMany.mockResolvedValue([goal()]);
    createNotification.mockResolvedValue(null);
    expect((await runGoalCelebrations(now)).notified).toBe(0);
  });
});
