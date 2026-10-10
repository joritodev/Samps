import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  project: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  projectParticipant: { deleteMany: vi.fn(), createMany: vi.fn() },
  demand: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  user: { count: vi.fn() },
  $transaction: vi.fn(),
}));
const logAudit = vi.hoisted(() => vi.fn());
const createNotification = vi.hoisted(() => vi.fn());
const guardDemand = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit, listAuditLogs: vi.fn() }));
vi.mock("@/lib/services/notifications.service", () => ({ createNotification }));
vi.mock("@/lib/permissions/demand-guard", () => ({ guardDemand }));

import { changeProjectStatus, createProject, linkDemandToProject, refreshProject } from "./projects.service";

const base = { clientIds: ["c1"] } as const;
const manager = { ...base, id: "m1", userType: "MANAGEMENT", permissions: ["projects.create", "clients.view_all"] } as unknown as SessionUser;
const social = { ...base, id: "s1", userType: "SOCIAL_MEDIA", permissions: ["projects.create", "clients.view_assigned", "demands.edit"] } as unknown as SessionUser;
const designer = { ...base, id: "d1", userType: "DESIGNER", permissions: ["clients.view_assigned"] } as unknown as SessionUser;
const external = { ...base, id: "x1", userType: "EXTERNAL_CLIENT", permissions: ["projects.create"] } as unknown as SessionUser;

const input = { clientId: "c1", title: "Evento de inauguração" };

beforeEach(() => {
  vi.resetAllMocks();
  logAudit.mockResolvedValue(undefined);
  createNotification.mockResolvedValue(null);
  db.$transaction.mockResolvedValue([]);
});

describe("createProject", () => {
  it("recusa quem não tem permissão e o cliente externo", async () => {
    await expect(createProject(designer, input)).rejects.toThrow(/permissão/);
    await expect(createProject(external, input)).rejects.toThrow(/permissão/);
    expect(db.project.create).not.toHaveBeenCalled();
  });

  it("recusa cliente fora do alcance do usuário", async () => {
    await expect(createProject(social, { ...input, clientId: "outro" })).rejects.toThrow(/Cliente/);
  });

  it("responsável repetido na lista de participantes conta uma vez", async () => {
    db.user.count.mockResolvedValue(2);
    db.project.create.mockResolvedValue({ id: "p1", title: input.title, clientId: "c1" });
    await expect(createProject(social, { ...input, ownerId: "u2", participantIds: ["u2", "u3"] })).resolves.toMatchObject({ id: "p1" });
    expect(db.user.count.mock.calls[0][0].where.id.in).toEqual(["u2", "u3"]);
  });

  it("recusa responsável que não é da equipe interna ativa", async () => {
    db.user.count.mockResolvedValue(0);
    await expect(createProject(social, { ...input, ownerId: "u9" })).rejects.toThrow(/inválido/);
  });

  it("cria, registra no histórico e avisa a equipe sem avisar quem criou", async () => {
    db.user.count.mockResolvedValue(3);
    db.project.create.mockResolvedValue({ id: "p1", title: input.title, clientId: "c1" });
    const result = await createProject(social, { ...input, ownerId: "u2", participantIds: ["u3", "s1"], outsideContract: true });
    expect(result.id).toBe("p1");
    expect(db.project.create.mock.calls[0][0].data).toMatchObject({ outsideContract: true, ownerId: "u2" });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PROJECT_CREATED", entityId: "p1" }));
    const notified = createNotification.mock.calls.map((c) => c[0].userId).sort();
    expect(notified).toEqual(["u2", "u3"]);
  });
});

describe("changeProjectStatus", () => {
  const project = (statuses: string[], status = "ACTIVE") => ({
    id: "p1",
    title: "Evento",
    clientId: "c1",
    status,
    demands: statuses.map((s) => ({ status: s })),
  });

  it("só a gestão conclui ou cancela", async () => {
    await expect(changeProjectStatus(social, "p1", "COMPLETED")).rejects.toThrow(/gestão/);
    await expect(changeProjectStatus(social, "p1", "CANCELLED")).rejects.toThrow(/gestão/);
  });

  it("não conclui com demanda aberta", async () => {
    db.project.findUnique.mockResolvedValue(project(["DONE", "OPEN"]));
    await expect(changeProjectStatus(manager, "p1", "COMPLETED")).rejects.toThrow(/1 demanda aberta/);
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("conclui com tudo entregue e grava o progresso", async () => {
    db.project.findUnique
      .mockResolvedValueOnce(project(["DONE", "PUBLISHED", "CANCELLED"]))
      .mockResolvedValueOnce({ ownerId: "u2", participants: [{ userId: "u3" }] });
    await changeProjectStatus(manager, "p1", "COMPLETED");
    expect(db.project.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "COMPLETED", progress: 100 } });
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  it("não encontra projeto de cliente fora do alcance", async () => {
    db.project.findUnique.mockResolvedValue({ ...project([]), clientId: "outro" });
    await expect(changeProjectStatus(social, "p1", "ACTIVE")).rejects.toThrow(/não encontrado/);
  });
});

describe("linkDemandToProject", () => {
  it("recusa projeto de outro cliente e projeto encerrado", async () => {
    guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c1" } });
    db.demand.findUnique.mockResolvedValue({ projectId: null, title: "Post" });
    db.project.findUnique.mockResolvedValueOnce({ id: "p1", clientId: "c2", status: "ACTIVE", title: "X" });
    await expect(linkDemandToProject(social, "d1", "p1")).rejects.toThrow(/não encontrado/);
    db.project.findUnique.mockResolvedValueOnce({ id: "p1", clientId: "c1", status: "COMPLETED", title: "X" });
    await expect(linkDemandToProject(social, "d1", "p1")).rejects.toThrow(/encerrado/);
    expect(db.demand.update).not.toHaveBeenCalled();
  });

  it("respeita a guarda da demanda", async () => {
    guardDemand.mockResolvedValue({ ok: false, error: "Demanda não encontrada." });
    await expect(linkDemandToProject(social, "d1", "p1")).rejects.toThrow("Demanda não encontrada.");
  });

  it("liga, atualiza o progresso e inicia o projeto sozinho", async () => {
    guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c1" } });
    db.demand.findUnique.mockResolvedValue({ projectId: null, title: "Post" });
    db.project.findUnique
      .mockResolvedValueOnce({ id: "p1", clientId: "c1", status: "PLANNING", title: "X" })
      .mockResolvedValueOnce({ id: "p1", status: "PLANNING", startDate: null, progress: 0, demands: [{ status: "OPEN" }] });
    await linkDemandToProject(social, "d1", "p1");
    expect(db.demand.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { projectId: "p1" } });
    expect(db.project.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { progress: 0, status: "ACTIVE" } });
  });
});

describe("refreshProject", () => {
  it("não escreve quando nada mudou", async () => {
    db.project.findUnique.mockResolvedValue({ id: "p1", status: "ACTIVE", startDate: null, progress: 50, demands: [{ status: "DONE" }, { status: "OPEN" }] });
    await refreshProject("p1");
    expect(db.project.update).not.toHaveBeenCalled();
  });
});
