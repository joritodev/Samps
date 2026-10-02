import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyDemand = vi.fn();
const findManyNotification = vi.fn();
const createNotification = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    demand: { findMany: (...a: unknown[]) => findManyDemand(...a) },
    notification: { findMany: (...a: unknown[]) => findManyNotification(...a) },
  },
}));
vi.mock("@/lib/services/notifications.service", () => ({
  createNotification: (...a: unknown[]) => createNotification(...a),
}));

import { runDeadlineNotifications } from "@/lib/services/deadline-notifications.service";

// 2 out 2026, 08:00 em São Paulo
const now = new Date("2026-10-02T11:00:00Z");
const demand = (over: Record<string, unknown>) => ({
  id: "d1",
  title: "Reel depoimento",
  status: "IN_PRODUCTION",
  dueDate: new Date("2026-10-03T18:00:00Z"),
  assigneeId: "u1",
  client: { name: "Bella Clinic" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  findManyNotification.mockResolvedValue([]);
  createNotification.mockResolvedValue({ id: "n" });
});

describe("runDeadlineNotifications", () => {
  it("só busca demandas abertas, com responsável ativo e prazo na janela", async () => {
    findManyDemand.mockResolvedValue([]);
    await runDeadlineNotifications(now);
    const where = findManyDemand.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(expect.arrayContaining(["DONE", "CANCELLED", "PUBLISHED"]));
    expect(where.assigneeId).toEqual({ not: null });
    expect(where.assignee).toEqual({ status: "ACTIVE" });
    expect(where.dueDate.gte).toBeInstanceOf(Date);
    expect(where.dueDate.lte.getTime()).toBeGreaterThan(now.getTime());
  });

  it("cria aviso de prazo amanhã e de atraso para o responsável", async () => {
    findManyDemand.mockResolvedValue([
      demand({ id: "a" }),
      demand({ id: "b", dueDate: new Date("2026-10-01T18:00:00Z"), assigneeId: "u2" }),
    ]);
    const r = await runDeadlineNotifications(now);
    expect(r).toMatchObject({ considered: 2, planned: 2, created: 2 });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        type: "DEADLINE_NEAR",
        title: "Prazo amanhã",
        link: "/demandas?abrir=a",
        message: "Reel depoimento · Bella Clinic",
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u2", type: "DEMAND_OVERDUE", link: "/demandas?abrir=b" })
    );
  });

  it("não repete o que já foi avisado nas últimas horas", async () => {
    findManyDemand.mockResolvedValue([demand({ id: "a" })]);
    findManyNotification.mockResolvedValue([
      { userId: "u1", type: "DEADLINE_NEAR", link: "/demandas?abrir=a" },
    ]);
    const r = await runDeadlineNotifications(now);
    expect(r).toMatchObject({ created: 0, skippedDuplicates: 1 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("aprovada/agendada não recebe 'prazo próximo', mas recebe atraso", async () => {
    findManyDemand.mockResolvedValue([
      demand({ id: "a", status: "APPROVED" }),
      demand({ id: "b", status: "SCHEDULED", dueDate: new Date("2026-10-01T18:00:00Z") }),
    ]);
    const r = await runDeadlineNotifications(now);
    expect(r.created).toBe(1);
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "DEMAND_OVERDUE" }));
  });

  it("conta quem desligou a preferência 'Prazos'", async () => {
    findManyDemand.mockResolvedValue([demand({ id: "a" })]);
    createNotification.mockResolvedValue(null);
    const r = await runDeadlineNotifications(now);
    expect(r).toMatchObject({ created: 0, skippedByPreference: 1 });
  });

  it("ignora demanda sem prazo ou sem responsável e não consulta duplicatas à toa", async () => {
    findManyDemand.mockResolvedValue([
      demand({ id: "a", dueDate: null }),
      demand({ id: "b", assigneeId: null }),
    ]);
    const r = await runDeadlineNotifications(now);
    expect(r.planned).toBe(0);
    expect(findManyNotification).not.toHaveBeenCalled();
  });
});
