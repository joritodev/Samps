import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  objective: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  keyResult: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  keyResultCheckIn: { create: vi.fn() },
  sector: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
const getPerformanceSummary = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));
vi.mock("@/lib/services/performance-summary.service", () => ({ getPerformanceSummary }));

import {
  addCheckIn,
  addKeyResult,
  createObjective,
  deleteKeyResult,
  deleteObjective,
  duplicateObjective,
  evaluateObjectives,
  listObjectivesForUser,
  setObjectiveStatus,
  updateKeyResult,
  updateObjective,
} from "./okr.service";

const user = (over: object) => ({ id: "x", userType: "DESIGNER", sectorId: "s1", permissions: [], ...over }) as unknown as SessionUser;
const manager = user({ id: "m1", userType: "MANAGEMENT", sectorId: null, permissions: ["goals.manage"] });
const owner = user({ id: "o1" });
const other = user({ id: "z1" });
const client = user({ id: "c1", userType: "EXTERNAL_CLIENT", permissions: ["goals.manage"] });

const input = { title: "Entregar com consistência", ownerId: "o1", scope: "AGENCY", startsOn: "2026-10-01", endsOn: "2026-12-31" };

function objective(over: Record<string, unknown> = {}) {
  return {
    id: "ob1", title: "T", description: null, ownerId: "o1", scope: "AGENCY", sectorId: null, userId: null, parentId: null,
    startsOn: new Date("2026-10-01T03:00:00Z"), endsOn: new Date("2027-01-01T02:59:59.999Z"), status: "ACTIVE",
    createdById: "m1", createdAt: new Date(), updatedAt: new Date(),
    owner: { name: "Dono" }, sector: null, user: null, keyResults: [], ...over,
  };
}
function kr(over: Record<string, unknown> = {}) {
  return {
    id: "kr1", objectiveId: "ob1", title: "R", kind: "MANUAL", metric: null, unit: "clientes", startValue: 0, targetValue: 10,
    currentValue: null, sortOrder: 0, checkIns: [], ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.objective.findMany.mockResolvedValue([]);
  db.objective.create.mockImplementation(async ({ data }) => objective(data));
  db.objective.update.mockImplementation(async ({ data }) => objective(data));
  db.keyResult.create.mockImplementation(async ({ data }) => kr(data));
  db.keyResult.update.mockImplementation(async ({ data }) => kr(data));
  db.user.findUnique.mockResolvedValue({ status: "ACTIVE", userType: "DESIGNER" });
  db.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  db.keyResultCheckIn.create.mockResolvedValue({ id: "ci1" });
});

describe("permissão de escrita", () => {
  it("só goals.manage cria, edita, encerra, apaga e duplica", async () => {
    for (const run of [
      () => createObjective(owner, input),
      () => updateObjective(owner, "ob1", input),
      () => setObjectiveStatus(owner, "ob1", "DONE"),
      () => deleteObjective(owner, "ob1"),
      () => duplicateObjective(owner, "ob1"),
      () => addKeyResult(owner, "ob1", { title: "R", kind: "MANUAL", startValue: 0, targetValue: 3 }),
      () => updateKeyResult(owner, "kr1", { title: "R", kind: "MANUAL", startValue: 0, targetValue: 3 }),
      () => deleteKeyResult(owner, "kr1"),
    ]) {
      await expect(run()).rejects.toThrow("permissão");
    }
    expect(db.objective.create).not.toHaveBeenCalled();
    expect(db.objective.delete).not.toHaveBeenCalled();
  });
  it("cliente externo nunca escreve nem lê", async () => {
    await expect(createObjective(client, input)).rejects.toThrow("permissão");
    await expect(addCheckIn(client, "kr1", { value: 1, confidence: "ON_TRACK" })).rejects.toThrow("permissão");
    expect(await listObjectivesForUser(client)).toEqual([]);
    expect(db.objective.findMany).not.toHaveBeenCalled();
  });
});

describe("objetivo", () => {
  it("cria e audita", async () => {
    await createObjective(manager, input);
    expect(db.objective.create.mock.calls[0][0].data).toMatchObject({ title: "Entregar com consistência", createdById: "m1" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "OBJECTIVE_CREATED", entityType: "Objective" }));
  });
  it("dono precisa ser pessoa ativa e interna", async () => {
    db.user.findUnique.mockResolvedValue({ status: "INACTIVE", userType: "DESIGNER" });
    await expect(createObjective(manager, input)).rejects.toThrow("Dono");
    db.user.findUnique.mockResolvedValue({ status: "ACTIVE", userType: "EXTERNAL_CLIENT" });
    await expect(createObjective(manager, input)).rejects.toThrow("Dono");
    expect(db.objective.create).not.toHaveBeenCalled();
  });
  it("pai: existe, tem escopo mais amplo e não é ele mesmo", async () => {
    db.objective.findUnique.mockResolvedValueOnce(null);
    await expect(createObjective(manager, { ...input, scope: "AGENCY", parentId: "p" })).rejects.toThrow("Objetivo-pai");
    db.sector.findUnique.mockResolvedValue({ isActive: true });
    db.objective.findUnique.mockResolvedValueOnce({ scope: "SECTOR" });
    await expect(createObjective(manager, { ...input, scope: "SECTOR", sectorId: "s1", parentId: "p" })).rejects.toThrow("escopo mais amplo");
    db.objective.findUnique.mockResolvedValueOnce({ scope: "AGENCY" });
    await createObjective(manager, { ...input, scope: "SECTOR", sectorId: "s1", parentId: "p" });
    expect(db.objective.create).toHaveBeenCalledTimes(1);
    db.objective.findUnique.mockResolvedValueOnce(objective());
    await expect(updateObjective(manager, "ob1", { ...input, parentId: "ob1" })).rejects.toThrow("pai dele mesmo");
  });
  it("setor precisa existir e estar ativo", async () => {
    db.sector.findUnique.mockResolvedValue(null);
    await expect(createObjective(manager, { ...input, scope: "SECTOR", sectorId: "x" })).rejects.toThrow("Setor");
  });
  it("edição audita antes e depois; inexistente falha", async () => {
    db.objective.findUnique.mockResolvedValueOnce(objective());
    await updateObjective(manager, "ob1", { ...input, title: "Novo" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "OBJECTIVE_UPDATED", previousValue: expect.objectContaining({ title: "T" }), newValue: expect.objectContaining({ title: "Novo" }) }));
    db.objective.findUnique.mockResolvedValueOnce(null);
    await expect(deleteObjective(manager, "x")).rejects.toThrow("não encontrado");
  });
  it("encerrar e apagar auditam", async () => {
    db.objective.findUnique.mockResolvedValue(objective());
    await setObjectiveStatus(manager, "ob1", "DONE");
    expect(db.objective.update).toHaveBeenCalledWith({ where: { id: "ob1" }, data: { status: "DONE" } });
    await deleteObjective(manager, "ob1");
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "OBJECTIVE_DELETED", entityId: "ob1" }));
  });
  it("duplicar vai para o próximo trimestre e zera os valores atuais", async () => {
    db.objective.findUnique.mockResolvedValue(
      objective({ startsOn: new Date("2026-10-01T03:00:00Z"), endsOn: new Date("2027-01-01T02:59:59.999Z"), keyResults: [kr({ currentValue: 7 })] })
    );
    await duplicateObjective(manager, "ob1");
    const data = db.objective.create.mock.calls[0][0].data;
    expect(data.startsOn.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(data.endsOn.toISOString()).toBe("2027-04-01T02:59:59.999Z");
    expect(data.keyResults.create[0]).not.toHaveProperty("currentValue");
    expect(data.createdById).toBe("m1");
  });
});

describe("resultado-chave", () => {
  it("limita a quantidade por objetivo", async () => {
    db.objective.findUnique.mockResolvedValue({ id: "ob1", _count: { keyResults: 8 } });
    await expect(addKeyResult(manager, "ob1", { title: "R", kind: "MANUAL", startValue: 0, targetValue: 3 })).rejects.toThrow("no máximo 8");
  });
  it("cria no fim da ordem e valida", async () => {
    db.objective.findUnique.mockResolvedValue({ id: "ob1", _count: { keyResults: 2 } });
    await addKeyResult(manager, "ob1", { title: "R", kind: "MANUAL", startValue: 0, targetValue: 3 });
    expect(db.keyResult.create.mock.calls[0][0].data).toMatchObject({ objectiveId: "ob1", sortOrder: 2 });
    await expect(addKeyResult(manager, "ob1", { title: "", kind: "MANUAL", startValue: 0, targetValue: 3 })).rejects.toThrow("título");
  });
  it("não troca o tipo", async () => {
    db.keyResult.findUnique.mockResolvedValue(kr());
    await expect(updateKeyResult(manager, "kr1", { title: "R", kind: "KPI", metric: "OVERDUE", startValue: 20, targetValue: 5 })).rejects.toThrow("trocar o tipo");
    await updateKeyResult(manager, "kr1", { title: "Novo", kind: "MANUAL", startValue: 0, targetValue: 12 });
    expect(db.keyResult.update).toHaveBeenCalled();
  });
});

describe("check-in", () => {
  const manual = () => kr({ objective: { id: "ob1", ownerId: "o1", status: "ACTIVE" } });
  it("dono e gestão registram; os demais não", async () => {
    db.keyResult.findUnique.mockResolvedValue(manual());
    await expect(addCheckIn(other, "kr1", { value: 3, confidence: "ON_TRACK" })).rejects.toThrow("dono do objetivo");
    await addCheckIn(owner, "kr1", { value: 3, confidence: "AT_RISK", note: "atrasou" });
    expect(db.keyResultCheckIn.create.mock.calls[0][0].data).toMatchObject({ keyResultId: "kr1", authorId: "o1", value: 3, confidence: "AT_RISK", note: "atrasou" });
    expect(db.keyResult.update).toHaveBeenCalledWith({ where: { id: "kr1" }, data: { currentValue: 3 } });
    await addCheckIn(manager, "kr1", { value: 4, confidence: "ON_TRACK" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "KEY_RESULT_CHECKED_IN", entityId: "kr1" }));
  });
  it("recusa resultado calculado, objetivo encerrado e entrada inválida", async () => {
    db.keyResult.findUnique.mockResolvedValue({ ...manual(), kind: "KPI" });
    await expect(addCheckIn(owner, "kr1", { value: 1, confidence: "ON_TRACK" })).rejects.toThrow("calculado");
    db.keyResult.findUnique.mockResolvedValue({ ...manual(), objective: { id: "ob1", ownerId: "o1", status: "DONE" } });
    await expect(addCheckIn(owner, "kr1", { value: 1, confidence: "ON_TRACK" })).rejects.toThrow("em andamento");
    db.keyResult.findUnique.mockResolvedValue(manual());
    await expect(addCheckIn(owner, "kr1", { value: -1, confidence: "ON_TRACK" })).rejects.toThrow("valor atual");
    db.keyResult.findUnique.mockResolvedValue(null);
    await expect(addCheckIn(owner, "x", { value: 1, confidence: "ON_TRACK" })).rejects.toThrow("não encontrado");
  });
});

describe("listObjectivesForUser", () => {
  const now = new Date("2026-11-15T15:00:00Z");
  it("gerente vê tudo; filtra pelo trimestre atual", async () => {
    await listObjectivesForUser(manager, { now });
    const where = db.objective.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
    expect(where.startsOn.lte.toISOString()).toBe("2027-01-01T02:59:59.999Z");
    expect(where.endsOn.gte.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
  it("trimestre anterior e todos", async () => {
    await listObjectivesForUser(manager, { now, period: "anterior" });
    const w = db.objective.findMany.mock.calls[0][0].where;
    expect(w.endsOn.gte.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(w.startsOn.lte.toISOString()).toBe("2026-10-01T02:59:59.999Z");
    await listObjectivesForUser(manager, { now, period: "todos" });
    expect(db.objective.findMany.mock.calls[1][0].where.startsOn).toBeUndefined();
  });
  it("os demais só veem agência, donos, o próprio setor e as próprias", async () => {
    db.objective.findMany.mockResolvedValue([
      objective({ id: "a" }),
      objective({ id: "b", scope: "SECTOR", sectorId: "s2", ownerId: "q" }),
      objective({ id: "c", scope: "USER", userId: "outro", ownerId: "q" }),
      objective({ id: "d", scope: "USER", userId: "x", ownerId: "q" }),
    ]);
    const rows = await listObjectivesForUser(user({ id: "x" }), { now });
    expect(db.objective.findMany.mock.calls[0][0].where.OR).toEqual([
      { scope: "AGENCY" }, { ownerId: "x" }, { scope: "SECTOR", sectorId: "s1" }, { scope: "USER", userId: "x" },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "d"]);
  });
});

describe("evaluateObjectives", () => {
  const now = new Date("2026-11-15T15:00:00Z");
  it("calcula KPI no período do objetivo e usa o último check-in no manual", async () => {
    getPerformanceSummary.mockResolvedValue({ indicators: { ON_TIME_RATE: { value: 0.8 } } });
    const rows = [
      objective({
        keyResults: [
          kr({ id: "k1", kind: "KPI", metric: "ON_TIME_RATE", unit: null, startValue: 0.7, targetValue: 0.9 }),
          kr({
            id: "k2", currentValue: 5,
            checkIns: [{ id: "c", value: 5, confidence: "OFF_TRACK", note: null, createdAt: new Date("2026-11-10"), author: { name: "Ana" } }],
          }),
        ],
      }),
    ];
    const [view] = await evaluateObjectives(rows as never, other, now);
    const [k1, k2] = view.keyResults;
    expect(getPerformanceSummary.mock.calls[0][0].range.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(k1).toMatchObject({ current: 0.8, progress: expect.closeTo(0.5) });
    expect(k2).toMatchObject({ current: 5, progress: 0.5, confidence: "OFF_TRACK" });
    expect(k2.history[0].authorName).toBe("Ana");
    expect(view.progress).toBeCloseTo(0.5);
    expect(view.confidence).toBe("OFF_TRACK");
    expect(view.canCheckIn).toBe(false);
    expect((await evaluateObjectives(rows as never, manager, now))[0].canCheckIn).toBe(true);
    expect((await evaluateObjectives(rows as never, owner, now))[0].canCheckIn).toBe(true);
  });
  it("objetivo ainda não começado não consulta indicadores", async () => {
    const future = objective({ startsOn: new Date("2027-01-01T03:00:00Z"), endsOn: new Date("2027-03-31T02:59:59Z"), keyResults: [kr({ kind: "KPI", metric: "OVERDUE", unit: null, startValue: 20, targetValue: 5 })] });
    const [view] = await evaluateObjectives([future] as never, owner, now);
    expect(getPerformanceSummary).not.toHaveBeenCalled();
    expect(view.keyResults[0].current).toBeNull();
    expect(view.progress).toBeNull();
  });
  it("objetivos com o mesmo recorte e período dividem a consulta", async () => {
    getPerformanceSummary.mockResolvedValue({ indicators: { OVERDUE: { value: 10 } } });
    const mk = (id: string) => objective({ id, keyResults: [kr({ kind: "KPI", metric: "OVERDUE", unit: null, startValue: 20, targetValue: 5 })] });
    await evaluateObjectives([mk("a"), mk("b")] as never, owner, now);
    expect(getPerformanceSummary).toHaveBeenCalledTimes(1);
  });
});
