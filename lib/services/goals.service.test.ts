import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  goal: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  sector: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const logAudit = vi.hoisted(() => vi.fn());
const getPerformanceSummary = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));
vi.mock("@/lib/services/performance-summary.service", () => ({ getPerformanceSummary }));

import {
  createGoal,
  deleteGoal,
  evaluateGoals,
  listGoalsForUser,
  listRunningGoals,
  setGoalActive,
  updateGoal,
} from "./goals.service";

const manager = { id: "m1", userType: "MANAGEMENT", sectorId: null, permissions: ["goals.manage"] } as unknown as SessionUser;
const designer = { id: "d1", userType: "DESIGNER", sectorId: "s1", permissions: ["productivity.view"] } as unknown as SessionUser;
const client = { id: "c1", userType: "EXTERNAL_CLIENT", sectorId: null, permissions: ["goals.manage"] } as unknown as SessionUser;

const input = { metric: "ON_TIME_RATE", scope: "AGENCY", target: 0.85, startsOn: "2026-10-01", endsOn: "2026-12-31" };

function goal(over: Record<string, unknown> = {}) {
  return {
    id: "g1",
    metric: "ON_TIME_RATE",
    scope: "AGENCY",
    sectorId: null,
    userId: null,
    target: 0.85,
    warnMargin: 0.1,
    startsOn: new Date("2026-10-01T03:00:00Z"),
    endsOn: new Date("2027-01-01T02:59:59.999Z"),
    note: null,
    active: true,
    createdById: "m1",
    createdAt: new Date(),
    updatedAt: new Date(),
    sector: null,
    user: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.goal.findMany.mockResolvedValue([]);
  db.goal.create.mockImplementation(async ({ data }) => goal(data));
  db.goal.update.mockImplementation(async ({ data }) => goal(data));
});

describe("permissão", () => {
  it("quem não tem goals.manage não escreve", async () => {
    await expect(createGoal(designer, input)).rejects.toThrow("permissão");
    await expect(updateGoal(designer, "g1", input)).rejects.toThrow("permissão");
    await expect(setGoalActive(designer, "g1", false)).rejects.toThrow("permissão");
    await expect(deleteGoal(designer, "g1")).rejects.toThrow("permissão");
    expect(db.goal.create).not.toHaveBeenCalled();
    expect(db.goal.delete).not.toHaveBeenCalled();
  });
  it("cliente externo nunca escreve nem lê, mesmo com a permissão", async () => {
    await expect(createGoal(client, input)).rejects.toThrow("permissão");
    expect(await listGoalsForUser(client)).toEqual([]);
    expect(db.goal.findMany).not.toHaveBeenCalled();
  });
});

describe("createGoal", () => {
  it("cria e audita", async () => {
    await createGoal(manager, input);
    expect(db.goal.create.mock.calls[0][0].data).toMatchObject({ metric: "ON_TIME_RATE", scope: "AGENCY", createdById: "m1" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "GOAL_CREATED", userId: "m1", entityType: "Goal" }));
  });
  it("rejeita entrada inválida sem tocar no banco", async () => {
    await expect(createGoal(manager, { ...input, target: 5 })).rejects.toThrow("0% a 100%");
    expect(db.goal.create).not.toHaveBeenCalled();
  });
  it("rejeita meta ativa sobreposta do mesmo indicador e escopo", async () => {
    db.goal.findMany.mockResolvedValue([{ startsOn: new Date("2026-12-01"), endsOn: new Date("2027-02-01") }]);
    await expect(createGoal(manager, input)).rejects.toThrow("Já existe uma meta ativa");
    expect(db.goal.create).not.toHaveBeenCalled();
  });
  it("exige setor ativo e pessoa ativa e interna", async () => {
    db.sector.findUnique.mockResolvedValue(null);
    await expect(createGoal(manager, { ...input, scope: "SECTOR", sectorId: "x" })).rejects.toThrow("Setor");
    db.user.findUnique.mockResolvedValue({ status: "ACTIVE", userType: "EXTERNAL_CLIENT" });
    await expect(createGoal(manager, { ...input, scope: "USER", userId: "x" })).rejects.toThrow("Pessoa");
    db.user.findUnique.mockResolvedValue({ status: "INACTIVE", userType: "DESIGNER" });
    await expect(createGoal(manager, { ...input, scope: "USER", userId: "x" })).rejects.toThrow("Pessoa");
    db.user.findUnique.mockResolvedValue({ status: "ACTIVE", userType: "DESIGNER" });
    await createGoal(manager, { ...input, scope: "USER", userId: "u9" });
    expect(db.goal.create).toHaveBeenCalledTimes(1);
  });
});

describe("updateGoal, setGoalActive e deleteGoal", () => {
  it("edição ignora a própria meta na sobreposição e audita antes e depois", async () => {
    db.goal.findUnique.mockResolvedValue(goal());
    await updateGoal(manager, "g1", { ...input, target: 0.9 });
    expect(db.goal.findMany.mock.calls[0][0].where.NOT).toEqual({ id: "g1" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "GOAL_UPDATED", previousValue: expect.objectContaining({ target: 0.85 }), newValue: expect.objectContaining({ target: 0.9 }) }));
  });
  it("meta inexistente", async () => {
    db.goal.findUnique.mockResolvedValue(null);
    await expect(updateGoal(manager, "x", input)).rejects.toThrow("não encontrada");
    await expect(deleteGoal(manager, "x")).rejects.toThrow("não encontrada");
  });
  it("pausar não valida sobreposição; reativar valida", async () => {
    db.goal.findUnique.mockResolvedValue(goal());
    await setGoalActive(manager, "g1", false);
    expect(db.goal.findMany).not.toHaveBeenCalled();
    db.goal.findUnique.mockResolvedValue(goal({ active: false }));
    db.goal.findMany.mockResolvedValue([{ startsOn: new Date("2026-11-01"), endsOn: new Date("2026-11-30") }]);
    await expect(setGoalActive(manager, "g1", true)).rejects.toThrow("Já existe");
  });
  it("apagar audita o que foi apagado", async () => {
    db.goal.findUnique.mockResolvedValue(goal());
    await deleteGoal(manager, "g1");
    expect(db.goal.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "GOAL_DELETED", entityId: "g1" }));
  });
});

describe("listGoalsForUser", () => {
  it("gerente vê tudo", async () => {
    await listGoalsForUser(manager);
    expect(db.goal.findMany.mock.calls[0][0].where).toEqual({});
  });
  it("os demais só veem agência, o próprio setor e as próprias", async () => {
    db.goal.findMany.mockResolvedValue([
      goal({ id: "a" }),
      goal({ id: "b", scope: "SECTOR", sectorId: "s2" }),
      goal({ id: "c", scope: "USER", userId: "outro" }),
      goal({ id: "d", scope: "USER", userId: "d1" }),
    ]);
    const rows = await listGoalsForUser(designer);
    const where = db.goal.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ scope: "AGENCY" }, { scope: "SECTOR", sectorId: "s1" }, { scope: "USER", userId: "d1" }]);
    expect(rows.map((r) => r.id)).toEqual(["a", "d"]);
  });
});

describe("evaluateGoals", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  function summaryOf(value: number | null) {
    return { indicators: { ON_TIME_RATE: { value }, OVERDUE: { value } } };
  }

  it("avalia no período da meta até hoje e define o semáforo", async () => {
    getPerformanceSummary.mockResolvedValue(summaryOf(0.9));
    const [view] = await evaluateGoals([goal()] as never, now);
    const call = getPerformanceSummary.mock.calls[0][0];
    expect(call.scope).toEqual({});
    expect(call.range.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(call.range.to).toEqual(now);
    expect(view).toMatchObject({ actual: 0.9, status: "met", state: "running" });
  });
  it("meta que ainda não começou fica sem leitura e não consulta", async () => {
    const [view] = await evaluateGoals([goal({ startsOn: new Date("2026-11-01T03:00:00Z") })] as never, now);
    expect(getPerformanceSummary).not.toHaveBeenCalled();
    expect(view).toMatchObject({ state: "upcoming", status: "none", actual: null });
  });
  it("meta encerrada usa o fim do período, não hoje", async () => {
    getPerformanceSummary.mockResolvedValue(summaryOf(0.5));
    const ended = goal({ endsOn: new Date("2026-10-10T02:59:59.999Z") });
    const [view] = await evaluateGoals([ended] as never, now);
    expect(getPerformanceSummary.mock.calls[0][0].range.to).toEqual(ended.endsOn);
    expect(view.state).toBe("ended");
    expect(view.status).toBe("off");
  });
  it("metas com o mesmo recorte e período dividem uma consulta; setor e pessoa viram escopo", async () => {
    getPerformanceSummary.mockResolvedValue(summaryOf(1));
    await evaluateGoals([
      goal({ id: "1" }),
      goal({ id: "2", metric: "OVERDUE", target: 5 }),
      goal({ id: "3", scope: "SECTOR", sectorId: "s1" }),
      goal({ id: "4", scope: "USER", userId: "u1" }),
    ] as never, now);
    expect(getPerformanceSummary).toHaveBeenCalledTimes(3);
    const scopes = getPerformanceSummary.mock.calls.map((c) => c[0].scope);
    expect(scopes).toContainEqual({ sectorId: "s1" });
    expect(scopes).toContainEqual({ userId: "u1" });
  });
});

describe("listRunningGoals", () => {
  it("agência e, se pedido, o setor; só ativas que cruzam hoje", async () => {
    const now = new Date("2026-10-15T12:00:00Z");
    await listRunningGoals({ sectorId: "s1" }, now);
    const where = db.goal.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ active: true, startsOn: { lte: now }, endsOn: { gte: now } });
    expect(where.OR).toEqual([{ scope: "AGENCY" }, { scope: "SECTOR", sectorId: "s1" }]);
    await listRunningGoals({}, now);
    expect(db.goal.findMany.mock.calls[1][0].where.OR).toEqual([{ scope: "AGENCY" }]);
  });
});
