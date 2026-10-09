import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  sector: { findUnique: vi.fn() },
  planMember: { findMany: vi.fn() },
  planCard: { findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  planDayBlock: { findMany: vi.fn() },
  planCapacityOverride: { findMany: vi.fn() },
  absence: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));

import { applyDistribution, previewDistribution } from "./planning-distribution.service";

const editor = {
  id: "u1",
  userType: "DESIGNER",
  permissions: ["planning.view", "planning.edit"],
  clientIds: [],
} as unknown as SessionUser;
const viewer = { ...editor, permissions: ["planning.view"] } as unknown as SessionUser;

const member = (id: string, userId: string, order: number) => ({
  id,
  userId,
  color: "#000",
  defaultCapacityHours: 6,
  sortOrder: order,
  active: true,
  user: { name: id },
});

function card(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    isoYear: 2026,
    isoWeek: 37,
    weekday: null,
    memberId: null,
    kind: "video",
    clientId: null,
    clientName: "COCO",
    demandId: null,
    templateId: null,
    title: "Vídeo 2",
    category: "Orgânico",
    durationHours: "2",
    status: "NAO_ALOCADO",
    pinned: false,
    required: false,
    recurring: false,
    dueDate: null,
    notes: null,
    position: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-09T15:00:00Z")); // quarta-feira, semana 37
  vi.clearAllMocks();
  db.sector.findUnique.mockResolvedValue({ id: "s-video", slug: "video", name: "Vídeo" });
  db.planMember.findMany.mockResolvedValue([member("m1", "u-m1", 1), member("m2", "u-m2", 2)]);
  db.planDayBlock.findMany.mockResolvedValue([]);
  db.planCapacityOverride.findMany.mockResolvedValue([]);
  db.absence.findMany.mockResolvedValue([]);
  db.planCard.aggregate.mockResolvedValue({ _max: { position: 1 } });
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db));
});
afterEach(() => vi.useRealTimers());

function cards(backlog: unknown[], allocated: unknown[] = []) {
  db.planCard.findMany.mockResolvedValueOnce(backlog).mockResolvedValueOnce(allocated);
}

describe("sugestão", () => {
  it("quem só vê não pede sugestão", async () => {
    await expect(previewDistribution(viewer, "video", { variant: 0, relaxed: false })).rejects.toThrow(
      /permissão/,
    );
  });

  it("sem demandas não alocadas avisa que está vazio", async () => {
    cards([]);
    expect(await previewDistribution(editor, "video", { variant: 0, relaxed: false })).toEqual({ empty: true });
  });

  it("sugere a primeira vaga a partir de hoje e devolve assinatura", async () => {
    cards([card()]);
    const preview = await previewDistribution(editor, "video", { variant: 0, relaxed: false });
    if ("empty" in preview) throw new Error("esperava sugestão");
    expect(preview.unplaced).toEqual([]);
    expect(preview.moves).toHaveLength(1);
    expect(preview.moves[0]).toMatchObject({ cardId: "c1", toWeekday: 3, toYear: 2026, toWeek: 37, toDate: "2026-09-09" });
    expect(preview.signature).toContain("c1:");
  });

  it("não usa dia com ausência nem dia bloqueado", async () => {
    db.absence.findMany.mockResolvedValue([
      { userId: "u-m1", startsAt: new Date("2026-09-09T00:00:00Z"), endsAt: new Date("2026-09-09T00:00:00Z"), canceledAt: null },
      { userId: "u-m2", startsAt: new Date("2026-09-09T00:00:00Z"), endsAt: new Date("2026-09-09T00:00:00Z"), canceledAt: null },
    ]);
    cards([card()]);
    const preview = await previewDistribution(editor, "video", { variant: 0, relaxed: false });
    if ("empty" in preview) throw new Error("esperava sugestão");
    expect(preview.moves[0]!.toDate).toBe("2026-09-10");
  });

  it("variante inválida é recusada", async () => {
    await expect(previewDistribution(editor, "video", { variant: -1, relaxed: false })).rejects.toThrow(/inválida/);
    await expect(previewDistribution(editor, "video", { variant: 1.5, relaxed: false })).rejects.toThrow(/inválida/);
  });

  it("cards de dias que já passaram não entram na reorganização", async () => {
    const past = card({ id: "velho", weekday: 1, memberId: "m1", isoWeek: 37, status: "PROGRAMADO" }); // segunda 07/09
    cards([card()], [past]);
    const preview = await previewDistribution(editor, "video", { variant: 0, relaxed: true });
    if ("empty" in preview) throw new Error("esperava sugestão");
    expect(preview.moves.map((m) => m.cardId)).toEqual(["c1"]);
  });
});

describe("aplicar", () => {
  async function previewSignature() {
    cards([card()]);
    const preview = await previewDistribution(editor, "video", { variant: 0, relaxed: false });
    if ("empty" in preview) throw new Error("esperava sugestão");
    return preview.signature;
  }

  it("aplica quando a sugestão ainda é a mesma e registra no histórico", async () => {
    const signature = await previewSignature();
    cards([card()]);
    const result = await applyDistribution(editor, "video", { variant: 0, relaxed: false, signature });
    expect(result).toEqual({ applied: 1 });
    expect(db.planCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ weekday: 3, isoWeek: 37, status: "PROGRAMADO", position: 2 }),
      }),
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PLAN_DISTRIBUTION_APPLIED", entityId: "c1" }),
    );
  });

  it("recusa quando o quadro mudou desde a sugestão", async () => {
    const signature = await previewSignature();
    // alguém alocou outro card enchendo as vagas de hoje
    cards([card()], [card({ id: "x", weekday: 3, memberId: "m1", isoWeek: 37, durationHours: "6", status: "PROGRAMADO" }), card({ id: "y", weekday: 3, memberId: "m2", isoWeek: 37, durationHours: "6", status: "PROGRAMADO" })]);
    await expect(
      applyDistribution(editor, "video", { variant: 0, relaxed: false, signature }),
    ).rejects.toThrow(/mudou/);
    expect(db.planCard.update).not.toHaveBeenCalled();
  });

  it("assinatura inventada não aplica nada", async () => {
    cards([card()]);
    await expect(
      applyDistribution(editor, "video", { variant: 0, relaxed: false, signature: "c1:m9:1:2026:37" }),
    ).rejects.toThrow(/mudou/);
    expect(db.planCard.update).not.toHaveBeenCalled();
  });

  it("quem só vê não aplica", async () => {
    await expect(
      applyDistribution(viewer, "video", { variant: 0, relaxed: false, signature: "" }),
    ).rejects.toThrow(/permissão/);
  });

  it("não aplica se alguma demanda não coube", async () => {
    cards([card({ dueDate: new Date("2026-09-01T00:00:00Z") })]);
    const pre = await previewDistribution(editor, "video", { variant: 0, relaxed: false });
    if ("empty" in pre) throw new Error("esperava sugestão");
    expect(pre.unplaced).toHaveLength(1);
    cards([card({ dueDate: new Date("2026-09-01T00:00:00Z") })]);
    await expect(
      applyDistribution(editor, "video", { variant: 0, relaxed: false, signature: pre.signature }),
    ).rejects.toThrow(/não couberam/);
    expect(db.planCard.update).not.toHaveBeenCalled();
  });
});
