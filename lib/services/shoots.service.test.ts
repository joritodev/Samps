import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  shoot: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  shootParticipant: { deleteMany: vi.fn(), createMany: vi.fn() },
  project: { findUnique: vi.fn() },
  demand: { findMany: vi.fn(), updateMany: vi.fn() },
  sector: { findFirst: vi.fn() },
  priorityLevel: { findFirst: vi.fn() },
  user: { count: vi.fn() },
  $transaction: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
const createNotification = vi.hoisted(() => vi.fn());
const createDemand = vi.hoisted(() => vi.fn());
const refreshProject = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit, listAuditLogs: vi.fn() }));
vi.mock("@/lib/services/notifications.service", () => ({ createNotification }));
vi.mock("@/lib/services/demands.service", () => ({ createDemand }));
vi.mock("@/lib/services/projects.service", () => ({ refreshProject }));

import { addEditingDemand, changeShootStatus, createShoot } from "./shoots.service";

const base = { clientIds: ["c1"] } as const;
const videomaker = { ...base, id: "v1", userType: "VIDEOMAKER", permissions: ["shoots.create", "clients.view_assigned"] } as unknown as SessionUser;
const social = { ...base, id: "s1", userType: "SOCIAL_MEDIA", permissions: ["shoots.create", "demands.create", "clients.view_assigned"] } as unknown as SessionUser;
const designer = { ...base, id: "d1", userType: "DESIGNER", permissions: ["clients.view_assigned"] } as unknown as SessionUser;

const input = { clientId: "c1", title: "Captação institucional", date: "2026-10-20" };

beforeEach(() => {
  vi.resetAllMocks();
  logAudit.mockResolvedValue(undefined);
  createNotification.mockResolvedValue(null);
  db.$transaction.mockResolvedValue([]);
});

describe("createShoot", () => {
  it("recusa quem não tem permissão", async () => {
    await expect(createShoot(designer, input)).rejects.toThrow(/permissão/);
  });

  it("recusa projeto de outro cliente", async () => {
    db.project.findUnique.mockResolvedValue({ clientId: "c2", status: "ACTIVE" });
    await expect(createShoot(social, { ...input, projectId: "p1" })).rejects.toThrow(/Projeto/);
  });

  it("quem não cria demanda não leva a edição junto", async () => {
    await expect(createShoot(videomaker, { ...input, createEditingDemand: true })).rejects.toThrow(/demanda de edição/);
    expect(db.shoot.create).not.toHaveBeenCalled();
  });

  it("cria com a edição ligada e atualiza o projeto", async () => {
    db.project.findUnique.mockResolvedValue({ clientId: "c1", status: "ACTIVE" });
    db.shoot.create.mockResolvedValue({
      id: "sh1",
      title: input.title,
      clientId: "c1",
      projectId: "p1",
      date: new Date("2026-10-20T12:00:00Z"),
      materialUrl: null,
    });
    db.sector.findFirst.mockResolvedValue({ id: "sec-video" });
    db.priorityLevel.findFirst.mockResolvedValue({ id: "pr1" });
    createDemand.mockResolvedValue({ id: "dm1", title: "Edição: Captação institucional" });
    const result = await createShoot(social, { ...input, projectId: "p1", createEditingDemand: true });
    expect(result).toEqual({ id: "sh1", editingDemandId: "dm1" });
    expect(createDemand.mock.calls[0][1]).toMatchObject({
      shootId: "sh1",
      projectId: "p1",
      sectorId: "sec-video",
      type: "VIDEO",
    });
    expect(createDemand.mock.calls[0][1].dueDate.toISOString().slice(0, 10)).toBe("2026-10-27");
    expect(refreshProject).toHaveBeenCalledWith("p1");
  });
});

describe("changeShootStatus", () => {
  const shoot = (status: string) => ({ id: "sh1", title: "Captação", clientId: "c1", status, projectId: null });

  it("só conclui com link válido do material", async () => {
    db.shoot.findUnique.mockResolvedValue(shoot("IN_PROGRESS"));
    await expect(changeShootStatus(videomaker, "sh1", "COMPLETED", {})).rejects.toThrow(/link do material/);
    await expect(changeShootStatus(videomaker, "sh1", "COMPLETED", { materialUrl: "javascript:x" })).rejects.toThrow(/link válido/);
    expect(db.shoot.update).not.toHaveBeenCalled();
  });

  it("não pula etapas", async () => {
    db.shoot.findUnique.mockResolvedValue(shoot("PLANNED"));
    await expect(changeShootStatus(videomaker, "sh1", "IN_PROGRESS")).rejects.toThrow(/não permitida/);
  });

  it("conclui, repassa o material às edições e avisa editor e equipe", async () => {
    db.shoot.findUnique
      .mockResolvedValueOnce(shoot("IN_PROGRESS"))
      .mockResolvedValueOnce({ ownerId: "v1", participants: [{ userId: "v2" }] });
    db.demand.findMany.mockResolvedValue([{ assigneeId: "e1" }]);
    await changeShootStatus(videomaker, "sh1", "COMPLETED", { materialUrl: " https://drive.google.com/x " });
    expect(db.shoot.update.mock.calls[0][0].data).toMatchObject({ status: "COMPLETED", materialUrl: "https://drive.google.com/x" });
    expect(db.demand.updateMany).toHaveBeenCalledWith({ where: { shootId: "sh1" }, data: { materialUrl: "https://drive.google.com/x" } });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "SHOOT_COMPLETED" }));
    const notified = createNotification.mock.calls.map((c) => c[0].userId).sort();
    expect(notified).toEqual(["e1", "v2"]);
  });

  it("agendar avisa a equipe, menos quem agendou", async () => {
    db.shoot.findUnique
      .mockResolvedValueOnce(shoot("PLANNED"))
      .mockResolvedValueOnce({ ownerId: "v1", participants: [{ userId: "v2" }] });
    await changeShootStatus(videomaker, "sh1", "SCHEDULED");
    expect(createNotification.mock.calls.map((c) => c[0].userId)).toEqual(["v2"]);
  });
});

describe("addEditingDemand", () => {
  it("recusa captação cancelada", async () => {
    db.shoot.findUnique.mockResolvedValue({ id: "sh1", title: "x", clientId: "c1", projectId: null, date: new Date(), materialUrl: null, status: "CANCELLED" });
    await expect(addEditingDemand(social, "sh1")).rejects.toThrow(/cancelada/);
  });
});
