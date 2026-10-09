import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const model = () => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  upsert: vi.fn(),
});
const db = vi.hoisted(() => ({
  planMember: undefined as unknown as ReturnType<typeof model>,
  planCard: undefined as unknown as ReturnType<typeof model>,
  planTemplate: undefined as unknown as ReturnType<typeof model>,
  planDayBlock: undefined as unknown as ReturnType<typeof model>,
  planCapacityOverride: undefined as unknown as ReturnType<typeof model>,
  planPreset: undefined as unknown as ReturnType<typeof model>,
  client: undefined as unknown as ReturnType<typeof model>,
  user: undefined as unknown as ReturnType<typeof model>,
  sector: undefined as unknown as ReturnType<typeof model>,
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));

import {
  addPlanMember,
  createPreset,
  duplicatePreviousWeek,
  saveClientTemplates,
  saveMemberSettings,
  setCapacityOverride,
  syncPlanWeek,
  toggleDayBlock,
} from "./planning-config.service";

const WEEK = { year: 2026, week: 37 };
const user = (permissions: string[], over: Record<string, unknown> = {}) =>
  ({ id: "u1", userType: "MANAGEMENT", permissions, clientIds: [], ...over }) as unknown as SessionUser;
const manager = user(["planning.view", "planning.edit", "planning.manage", "clients.view_all"]);
const editor = user(["planning.view", "planning.edit"], { userType: "DESIGNER" });

const tpl = { title: "Vídeo", kind: "video", category: "Orgânico", durationHours: 2, weeklyQuantity: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [
    "planMember",
    "planCard",
    "planTemplate",
    "planDayBlock",
    "planCapacityOverride",
    "planPreset",
    "client",
    "user",
    "sector",
  ] as const) {
    db[key] = model();
  }
  db.sector.findUnique.mockResolvedValue({ id: "s-video", slug: "video", name: "Vídeo" });
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as unknown[]),
  );
  db.planMember.findFirst.mockResolvedValue({ id: "m1", user: { name: "Pedro" } });
  db.planMember.count.mockResolvedValue(1);
  db.planMember.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
  db.planPreset.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
  db.client.findUnique.mockResolvedValue({ id: "c1", name: "COCO BAMBU" });
  db.planCard.findMany.mockResolvedValue([]);
  db.planTemplate.findMany.mockResolvedValue([]);
});

describe("só a gestão configura", () => {
  it("quem edita cards não mexe em equipe, capacidade, bloqueio, tipos, modelos nem semana", async () => {
    const calls = [
      addPlanMember(editor, "video", "x", WEEK),
      saveMemberSettings(editor, "video", WEEK, [{ id: "m1", color: "#112233", defaultCapacityHours: 6 }]),
      setCapacityOverride(editor, "video", WEEK, { memberId: "m1", weekday: 2, hours: 4, week: null }),
      toggleDayBlock(editor, "video", WEEK, 2, null),
      createPreset(editor, "video", WEEK, { label: "x", hours: 1 }),
      saveClientTemplates(editor, "video", WEEK, "c1", [tpl]),
      syncPlanWeek(editor, "video", WEEK),
      duplicatePreviousWeek(editor, "video", WEEK),
    ];
    for (const call of calls) await expect(call).rejects.toThrow(/permissão/);
    expect(db.planMember.upsert).not.toHaveBeenCalled();
    expect(db.planDayBlock.create).not.toHaveBeenCalled();
    expect(db.planTemplate.create).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("cliente externo nunca, mesmo com a permissão", async () => {
    const external = user(["planning.manage"], { userType: "EXTERNAL_CLIENT" });
    await expect(toggleDayBlock(external, "video", WEEK, 2, null)).rejects.toThrow(/permissão/);
  });

  it("setor desconhecido não configura nada", async () => {
    await expect(toggleDayBlock(manager, "social", WEEK, 2, null)).rejects.toThrow(/Setor/);
    expect(db.planDayBlock.create).not.toHaveBeenCalled();
  });
});

describe("equipe e capacidade", () => {
  it("adiciona só quem é do setor", async () => {
    db.user.findFirst.mockResolvedValue(null);
    await expect(addPlanMember(manager, "video", "outro", WEEK)).rejects.toThrow(/não pertence ao setor/);
    db.user.findFirst.mockResolvedValue({ id: "u9", name: "Luiza" });
    await addPlanMember(manager, "video", "u9", WEEK);
    expect(db.planMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u9" }, create: expect.objectContaining({ sectorId: "s-video", sortOrder: 3 }) }),
    );
  });

  it("salvar configuração recusa profissional de outro setor e cor inválida", async () => {
    db.planMember.count.mockResolvedValue(0);
    await expect(
      saveMemberSettings(manager, "video", WEEK, [{ id: "alheio", color: "#112233", defaultCapacityHours: 6 }]),
    ).rejects.toThrow(/Profissional inválido/);
    await expect(
      saveMemberSettings(manager, "video", WEEK, [{ id: "m1", color: "azul", defaultCapacityHours: 6 }]),
    ).rejects.toThrow(/cor/);
    expect(db.planMember.update).not.toHaveBeenCalled();
  });

  it("capacidade substitui a linha existente (apaga e cria na mesma transação)", async () => {
    await setCapacityOverride(manager, "video", WEEK, {
      memberId: "m1",
      weekday: 5,
      hours: 4,
      week: { year: 2026, week: 37 },
    });
    expect(db.planCapacityOverride.deleteMany).toHaveBeenCalledWith({
      where: { memberId: "m1", weekday: 5, isoYear: 2026, isoWeek: 37 },
    });
    expect(db.planCapacityOverride.create).toHaveBeenCalledWith({
      data: { memberId: "m1", weekday: 5, isoYear: 2026, isoWeek: 37, hours: 4 },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("capacidade fixa do dia grava ano e semana nulos", async () => {
    await setCapacityOverride(manager, "video", WEEK, { memberId: "m1", weekday: 5, hours: 3, week: null });
    expect(db.planCapacityOverride.create.mock.calls[0]![0].data).toMatchObject({ isoYear: null, isoWeek: null });
  });
});

describe("bloqueios", () => {
  it("cria quando não existe e remove quando existe", async () => {
    db.planDayBlock.findFirst.mockResolvedValue(null);
    expect(await toggleDayBlock(manager, "video", WEEK, 3, null)).toEqual({ blocked: true });
    expect(db.planDayBlock.create.mock.calls[0]![0].data).toMatchObject({
      weekday: 3,
      memberId: null,
      reason: "Feriado / dia bloqueado",
    });
    db.planDayBlock.findFirst.mockResolvedValue({ id: "b1" });
    expect(await toggleDayBlock(manager, "video", WEEK, 3, "m1")).toEqual({ blocked: false });
    expect(db.planDayBlock.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
  });

  it("dia fora de segunda a sábado e profissional de outro setor", async () => {
    await expect(toggleDayBlock(manager, "video", WEEK, 7, null)).rejects.toThrow(/Dia inválido/);
    db.planMember.findFirst.mockResolvedValue(null);
    await expect(toggleDayBlock(manager, "video", WEEK, 3, "alheio")).rejects.toThrow(/Profissional inválido/);
  });
});

describe("tipos de produção", () => {
  it("nome repetido vira mensagem clara", async () => {
    const { Prisma } = await import("@prisma/client");
    db.planPreset.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" }),
    );
    await expect(createPreset(manager, "video", WEEK, { label: "Reel", hours: 1 })).rejects.toThrow(/Já existe/);
  });
});

describe("demandas fixas do cliente", () => {
  it("cliente fora do escopo não é encontrado", async () => {
    const limited = user(["planning.manage", "clients.view_assigned"], { clientIds: ["outro"] });
    await expect(saveClientTemplates(limited, "video", WEEK, "c1", [tpl])).rejects.toThrow(/Cliente não encontrado/);
    expect(db.planTemplate.create).not.toHaveBeenCalled();
  });

  it("responsável de outro setor é recusado", async () => {
    db.planMember.count.mockResolvedValue(0);
    await expect(
      saveClientTemplates(manager, "video", WEEK, "c1", [{ ...tpl, preferredMemberId: "alheio" }]),
    ).rejects.toThrow(/Responsável inválido/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("id de demanda de outro cliente derruba a gravação", async () => {
    db.planTemplate.findMany.mockResolvedValue([{ id: "t1" }]);
    await expect(
      saveClientTemplates(manager, "video", WEEK, "c1", [{ ...tpl, id: "t-de-outro" }]),
    ).rejects.toThrow(/Demanda fixa não encontrada/);
  });

  it("apaga as removidas, atualiza as existentes e cria as novas", async () => {
    db.planTemplate.findMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
    await saveClientTemplates(manager, "video", WEEK, "c1", [{ ...tpl, id: "t1" }, { ...tpl, title: "Nova" }]);
    expect(db.planTemplate.deleteMany).toHaveBeenCalledWith({
      where: { sectorId: "s-video", clientId: "c1", id: { notIn: ["t1"] } },
    });
    expect(db.planTemplate.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "t1" } }));
    expect(db.planTemplate.create.mock.calls[0]![0].data).toMatchObject({
      sectorId: "s-video",
      clientId: "c1",
      title: "Nova",
      sortOrder: 1,
    });
  });
});

describe("gerar e duplicar a semana", () => {
  const template = {
    id: "t1",
    clientId: "c1",
    client: { name: "COCO BAMBU" },
    title: "Vídeo",
    kind: "video",
    category: "Orgânico",
    durationHours: "2",
    weeklyQuantity: 2,
    preferredMemberId: null,
    preferredWeekday: null,
    required: true,
    active: true,
    sortOrder: 0,
  };

  it("gera os cards que faltam, trava a semana e registra o histórico", async () => {
    db.planTemplate.findMany.mockResolvedValue([template]);
    const result = await syncPlanWeek(manager, "video", WEEK);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(result.generated).toBe(2);
    expect(db.planCard.createMany.mock.calls[0]![0].data).toHaveLength(2);
    expect(db.planCard.createMany.mock.calls[0]![0].data[0]).toMatchObject({
      sectorId: "s-video",
      isoYear: 2026,
      isoWeek: 37,
      templateId: "t1",
      title: "Vídeo 1",
      clientName: "COCO BAMBU",
      status: "NAO_ALOCADO",
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PLAN_WEEK_GENERATED" }));
  });

  it("sem nada a gerar não grava nem registra", async () => {
    const result = await syncPlanWeek(manager, "video", WEEK);
    expect(result).toEqual({ generated: 0, duplicated: 0 });
    expect(db.planCard.createMany).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("duplicar busca os fixos da semana anterior (inclusive virada de ano)", async () => {
    await duplicatePreviousWeek(manager, "video", { year: 2027, week: 1 });
    expect(db.planCard.findMany.mock.calls[0]![0].where).toMatchObject({
      isoYear: 2026,
      isoWeek: 53,
      recurring: true,
    });
  });
});
