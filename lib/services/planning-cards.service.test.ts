import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  planCard: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  planMember: { findFirst: vi.fn(), findMany: vi.fn() },
  client: { findUnique: vi.fn() },
  sector: { findUnique: vi.fn() },
  auditLog: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
const guardDemand = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));
vi.mock("@/lib/permissions/demand-guard", () => ({ guardDemand }));

import {
  createPlanCard,
  deletePlanCard,
  duplicatePlanCard,
  listPlanningHistory,
  movePlanCard,
  togglePlanCardComplete,
  updatePlanCard,
} from "./planning-cards.service";

const WEEK = { year: 2026, week: 37 };
const user = (permissions: string[], over: Record<string, unknown> = {}) =>
  ({
    id: "u1",
    userType: "DESIGNER",
    permissions,
    clientIds: ["c1"],
    ...over,
  }) as unknown as SessionUser;

const editor = user(["planning.view", "planning.edit", "clients.view_assigned"]);
const viewer = user(["planning.view"]);
const manager = user(["planning.view", "planning.edit", "planning.manage"], { userType: "MANAGEMENT" });
const external = user(["planning.view", "planning.edit"], { userType: "EXTERNAL_CLIENT" });

const input = { title: "Vídeo 1", kind: "video", category: "Orgânico", durationHours: 2 };

function dbCard(over: Record<string, unknown> = {}) {
  return {
    id: "k1",
    sectorId: "s-video",
    isoYear: 2026,
    isoWeek: 37,
    weekday: 2,
    memberId: "m1",
    kind: "video",
    clientId: null,
    clientName: null,
    demandId: null,
    templateId: null,
    title: "Vídeo 1",
    category: "Orgânico",
    durationHours: "2",
    status: "PROGRAMADO",
    pinned: false,
    required: false,
    recurring: false,
    dueDate: null,
    notes: null,
    position: 0,
    sector: { id: "s-video", slug: "video" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.sector.findUnique.mockResolvedValue({ id: "s-video", slug: "video", name: "Vídeo" });
  db.planMember.findFirst.mockResolvedValue({ id: "m1", user: { name: "Pedro" } });
  db.planMember.findMany.mockResolvedValue([{ id: "m1", user: { name: "Pedro" } }]);
  db.planCard.create.mockImplementation(async ({ data }) => ({ id: "novo", ...data }));
  db.planCard.update.mockResolvedValue({});
  db.planCard.aggregate.mockResolvedValue({ _max: { position: 3 } });
  db.planCard.findUnique.mockResolvedValue(dbCard());
  db.planCard.count.mockResolvedValue(2);
  db.$transaction.mockResolvedValue([]);
  db.client.findUnique.mockResolvedValue({ id: "c1", name: "COCO BAMBU" });
  guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c1" } });
});

describe("permissão", () => {
  it("quem só vê não cria, edita, move, conclui nem duplica", async () => {
    await expect(createPlanCard(viewer, "video", WEEK, input)).rejects.toThrow(/permissão/);
    await expect(updatePlanCard(viewer, "k1", WEEK, input)).rejects.toThrow(/permissão/);
    await expect(togglePlanCardComplete(viewer, "k1")).rejects.toThrow(/permissão/);
    await expect(duplicatePlanCard(viewer, "k1", WEEK)).rejects.toThrow(/permissão/);
    await expect(
      movePlanCard(viewer, { cardId: "k1", to: null, orderedIds: ["k1"], fromOrderedIds: [] }),
    ).rejects.toThrow(/permissão/);
    expect(db.planCard.create).not.toHaveBeenCalled();
    expect(db.planCard.update).not.toHaveBeenCalled();
  });

  it("cliente externo nunca grava, mesmo com as permissões", async () => {
    await expect(createPlanCard(external, "video", WEEK, input)).rejects.toThrow(/permissão/);
    expect(db.planCard.create).not.toHaveBeenCalled();
  });

  it("editor não exclui; gestão exclui e registra no histórico", async () => {
    await expect(deletePlanCard(editor, "k1")).rejects.toThrow(/permissão/);
    expect(db.planCard.delete).not.toHaveBeenCalled();
    await deletePlanCard(manager, "k1");
    expect(db.planCard.delete).toHaveBeenCalledWith({ where: { id: "k1" } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PLAN_CARD_DELETED", entityType: "PlanCard", entityId: "k1" }),
    );
  });
});

describe("criar card", () => {
  it("setor vem da rota: slug desconhecido não cria", async () => {
    await expect(createPlanCard(editor, "social", WEEK, input)).rejects.toThrow(/Setor/);
    expect(db.planCard.create).not.toHaveBeenCalled();
  });

  it("cria no setor da rota, na semana aberta, com autor e histórico", async () => {
    await createPlanCard(editor, "video", WEEK, { ...input, weekday: 2, memberId: "m1" });
    const data = db.planCard.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      sectorId: "s-video",
      isoYear: 2026,
      isoWeek: 37,
      weekday: 2,
      memberId: "m1",
      status: "PROGRAMADO",
      createdById: "u1",
      position: 4,
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PLAN_CARD_CREATED",
        newValue: expect.objectContaining({ sector: "video", isoYear: 2026, isoWeek: 37 }),
      }),
    );
  });

  it("responsável precisa ser do mesmo setor e ativo", async () => {
    db.planMember.findFirst.mockResolvedValue(null);
    await expect(
      createPlanCard(editor, "video", WEEK, { ...input, weekday: 2, memberId: "outro" }),
    ).rejects.toThrow(/Responsável inválido/);
    expect(db.planMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sectorId: "s-video", active: true }) }),
    );
    expect(db.planCard.create).not.toHaveBeenCalled();
  });

  it("entrada inválida é recusada sem tocar no banco", async () => {
    await expect(createPlanCard(editor, "video", WEEK, { ...input, title: " " })).rejects.toThrow(
      /nome do card/,
    );
    await expect(createPlanCard(editor, "video", { year: 1999, week: 1 }, input)).rejects.toThrow(
      /Semana inválida/,
    );
    expect(db.planCard.create).not.toHaveBeenCalled();
  });
});

describe("vínculo com cliente e demanda (achado S5 da auditoria)", () => {
  it("cliente fora do escopo da pessoa não é encontrado", async () => {
    await expect(
      createPlanCard(editor, "video", WEEK, { ...input, clientId: "c-outro" }),
    ).rejects.toThrow(/Cliente não encontrado/);
    expect(db.planCard.create).not.toHaveBeenCalled();
  });

  it("nome do cliente vem do banco, não do que a tela mandou", async () => {
    await createPlanCard(editor, "video", WEEK, {
      ...input,
      clientId: "c1",
      clientName: "NOME FALSO",
    });
    expect(db.planCard.create.mock.calls[0]![0].data).toMatchObject({
      clientId: "c1",
      clientName: "COCO BAMBU",
    });
  });

  it("demanda passa pela guarda de escopo e herda o cliente", async () => {
    await createPlanCard(editor, "video", WEEK, { ...input, demandId: "d1" });
    expect(guardDemand).toHaveBeenCalledWith(editor, "d1", {});
    expect(db.planCard.create.mock.calls[0]![0].data).toMatchObject({
      demandId: "d1",
      clientId: "c1",
      clientName: "COCO BAMBU",
    });
  });

  it("demanda sem acesso é recusada com a mensagem da guarda", async () => {
    guardDemand.mockResolvedValue({ ok: false, error: "Demanda não encontrada." });
    await expect(
      createPlanCard(editor, "video", WEEK, { ...input, demandId: "d-alheia" }),
    ).rejects.toThrow("Demanda não encontrada.");
    expect(db.planCard.create).not.toHaveBeenCalled();
  });

  it("demanda de outro cliente que o escolhido é recusada", async () => {
    guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c2" } });
    await expect(
      createPlanCard(editor, "video", WEEK, { ...input, clientId: "c1", demandId: "d1" }),
    ).rejects.toThrow(/não é deste cliente/);
  });
});

describe("editar, mover e concluir", () => {
  it("editar cartão fora de um setor conhecido falha como não encontrado", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ sector: { id: "x", slug: "social" } }));
    await expect(updatePlanCard(editor, "k1", WEEK, input)).rejects.toThrow(/Card não encontrado/);
    db.planCard.findUnique.mockResolvedValue(null);
    await expect(updatePlanCard(editor, "k1", WEEK, input)).rejects.toThrow(/Card não encontrado/);
  });

  it("editar registra o que mudou, em português", async () => {
    await updatePlanCard(editor, "k1", WEEK, {
      ...input,
      durationHours: 3,
      weekday: 2,
      memberId: "m1",
    });
    const audit = logAudit.mock.calls[0]![0];
    expect(audit.action).toBe("PLAN_CARD_UPDATED");
    expect(audit.newValue.description).toContain("horas: 2h → 3h");
  });

  it("card que sai do backlog assume a semana aberta; o que já estava alocado mantém a sua", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ weekday: null, memberId: null, isoWeek: 30 }));
    await updatePlanCard(editor, "k1", WEEK, { ...input, weekday: 3, memberId: "m1" });
    expect(db.planCard.update.mock.calls[0]![0].data).toMatchObject({ isoYear: 2026, isoWeek: 37 });

    db.planCard.update.mockClear();
    db.planCard.findUnique.mockResolvedValue(dbCard({ isoWeek: 30 }));
    await updatePlanCard(editor, "k1", WEEK, { ...input, weekday: 3, memberId: "m1" });
    expect(db.planCard.update.mock.calls[0]![0].data).toMatchObject({ isoWeek: 30 });
  });

  it("card fixo semanal não é arrastado", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ pinned: true }));
    await expect(
      movePlanCard(editor, {
        cardId: "k1",
        to: { memberId: "m1", weekday: 3, isoYear: 2026, isoWeek: 37 },
        orderedIds: ["k1"],
        fromOrderedIds: [],
      }),
    ).rejects.toThrow(/fixo semanal/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("ids de outro setor na ordem derrubam o movimento", async () => {
    db.planCard.count.mockResolvedValue(1); // um dos dois ids não é do setor
    await expect(
      movePlanCard(editor, {
        cardId: "k1",
        to: { memberId: "m1", weekday: 3, isoYear: 2026, isoWeek: 37 },
        orderedIds: ["k1", "k2"],
        fromOrderedIds: [],
      }),
    ).rejects.toThrow(/Card não encontrado/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("mover para coluna grava posição, status e histórico", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ weekday: null, memberId: null, status: "NAO_ALOCADO" }));
    await movePlanCard(editor, {
      cardId: "k1",
      to: { memberId: "m1", weekday: 3, isoYear: 2026, isoWeek: 37 },
      orderedIds: ["k0", "k1"],
      fromOrderedIds: [],
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.planCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "k1" },
        data: expect.objectContaining({ memberId: "m1", weekday: 3, status: "PROGRAMADO", position: 1 }),
      }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PLAN_CARD_MOVED" }),
    );
  });

  it("concluir alterna o status e reabrir volta a programado", async () => {
    expect(await togglePlanCardComplete(editor, "k1")).toEqual({ status: "CONCLUIDO" });
    db.planCard.findUnique.mockResolvedValue(dbCard({ status: "CONCLUIDO" }));
    expect(await togglePlanCardComplete(editor, "k1")).toEqual({ status: "PROGRAMADO" });
  });

  it("duplicar cria cópia solta no backlog, sem demanda", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ demandId: "d1", templateId: "t1", pinned: true }));
    await duplicatePlanCard(editor, "k1", WEEK);
    expect(db.planCard.create.mock.calls[0]![0].data).toMatchObject({
      title: "Vídeo 1 — cópia",
      weekday: null,
      memberId: null,
      demandId: null,
      templateId: null,
      pinned: false,
      status: "NAO_ALOCADO",
    });
  });
});

describe("histórico", () => {
  it("filtra por setor e semana e devolve texto e autor", async () => {
    db.auditLog.findMany.mockResolvedValue([
      {
        id: "a1",
        newValue: { description: "Card criado" },
        createdAt: new Date("2026-09-08T12:00:00Z"),
        user: { name: "Pedro" },
      },
    ]);
    const entries = await listPlanningHistory(viewer, "video", WEEK);
    expect(entries).toEqual([
      { id: "a1", description: "Card criado", actorName: "Pedro", createdAt: "2026-09-08T12:00:00.000Z" },
    ]);
    const where = db.auditLog.findMany.mock.calls[0]![0].where;
    expect(JSON.stringify(where)).toContain('"sector"');
    expect(JSON.stringify(where)).toContain("2026");
  });

  it("setor desconhecido não devolve nada", async () => {
    expect(await listPlanningHistory(viewer, "social", WEEK)).toEqual([]);
    expect(db.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("sem permissão de ver, falha", async () => {
    await expect(listPlanningHistory(user([]), "video", WEEK)).rejects.toThrow(/permissão/);
  });
});

describe("vínculo já existente e falha no histórico", () => {
  it("editar um card de cliente fora do escopo não revalida o que já estava vinculado", async () => {
    db.planCard.findUnique.mockResolvedValue(
      dbCard({ clientId: "c-alheio", clientName: "OUTRO", demandId: "d-alheia" }),
    );
    await updatePlanCard(editor, "k1", WEEK, {
      ...input,
      clientId: "c-alheio",
      demandId: "d-alheia",
      notes: "só ajustei a observação",
    });
    expect(guardDemand).not.toHaveBeenCalled();
    expect(db.client.findUnique).not.toHaveBeenCalled();
    expect(db.planCard.update.mock.calls[0]![0].data).toMatchObject({
      clientId: "c-alheio",
      clientName: "OUTRO",
      demandId: "d-alheia",
    });
  });

  it("trocar para uma demanda nova volta a passar pela guarda", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ clientId: "c1", clientName: "COCO BAMBU", demandId: "d1" }));
    await updatePlanCard(editor, "k1", WEEK, { ...input, clientId: "c1", demandId: "d2" });
    expect(guardDemand).toHaveBeenCalledWith(editor, "d2", {});
  });

  it("trocar de cliente mantendo a demanda velha também é revalidado", async () => {
    db.planCard.findUnique.mockResolvedValue(dbCard({ clientId: "c1", clientName: "COCO BAMBU", demandId: "d1" }));
    guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c1" } });
    await expect(
      updatePlanCard(editor, "k1", WEEK, { ...input, clientId: "c2", demandId: "d1" }),
    ).rejects.toThrow(/não é deste cliente/);
  });

  it("falha ao gravar o histórico não desfaz nem mascara a alteração", async () => {
    logAudit.mockRejectedValue(new Error("banco fora"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(createPlanCard(editor, "video", WEEK, input)).resolves.toEqual({ id: "novo" });
    expect(db.planCard.create).toHaveBeenCalled();
    spy.mockRestore();
    logAudit.mockReset();
  });
});
