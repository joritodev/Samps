import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

const db = vi.hoisted(() => ({
  demand: { findUnique: vi.fn(), update: vi.fn() },
  auditLog: { findMany: vi.fn() },
}));
const logAudit = vi.hoisted(() => vi.fn());
const guardDemand = vi.hoisted(() => vi.fn());
const resolveOpenDelay = vi.hoisted(() => vi.fn());
const syncDemandDelays = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/audit.service", () => ({ logAudit }));
vi.mock("@/lib/permissions/demand-guard", () => ({ guardDemand }));
vi.mock("@/lib/services/delay.service", () => ({ resolveOpenDelay, syncDemandDelays }));

import { listDemandHistory, updateDemandDescription } from "./demand-history.service";
import { changeDemandDeadline } from "./deadline.service";

const designer = { id: "d1", userType: "DESIGNER", permissions: ["clients.view_assigned"], clientIds: ["c1"] } as unknown as SessionUser;
const external = { id: "x1", userType: "EXTERNAL_CLIENT", permissions: [], clientIds: ["c1"] } as unknown as SessionUser;

beforeEach(() => {
  vi.resetAllMocks();
  logAudit.mockResolvedValue(undefined);
  guardDemand.mockResolvedValue({ ok: true, demand: { clientId: "c1" } });
});

describe("changeDemandDeadline (sem permissão especial)", () => {
  const demand = { id: "dm1", dueDate: new Date("2026-10-12T12:00:00Z") };

  it("qualquer pessoa interna muda o prazo, sem justificativa", async () => {
    db.demand.findUnique.mockResolvedValue(demand);
    await changeDemandDeadline("dm1", designer, { field: "dueDate", newDate: new Date("2026-10-20T12:00:00Z") });
    expect(db.demand.update).toHaveBeenCalledWith({ where: { id: "dm1" }, data: { dueDate: new Date("2026-10-20T12:00:00Z") } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DEADLINE_CHANGED",
        newValue: expect.objectContaining({ previous: "2026-10-12T12:00:00.000Z", new: "2026-10-20T12:00:00.000Z", justification: "" }),
      })
    );
    expect(resolveOpenDelay).toHaveBeenCalled();
  });

  it("grava o motivo quando informado e recusa data repetida e cliente externo", async () => {
    db.demand.findUnique.mockResolvedValue(demand);
    await changeDemandDeadline("dm1", designer, { field: "dueDate", newDate: new Date("2026-10-15T12:00:00Z"), justification: " pedido do cliente " });
    expect(logAudit.mock.calls[0][0].newValue.justification).toBe("pedido do cliente");
    await expect(changeDemandDeadline("dm1", designer, { field: "dueDate", newDate: new Date("2026-10-12T20:00:00Z") })).rejects.toThrow(/igual/);
    await expect(changeDemandDeadline("dm1", external, { field: "dueDate", newDate: new Date("2026-10-30T12:00:00Z") })).rejects.toThrow(/permissão/);
  });
});

describe("updateDemandDescription", () => {
  it("grava a nova descrição e guarda a anterior no histórico", async () => {
    db.demand.findUnique.mockResolvedValue({ description: "antiga" });
    await updateDemandDescription(designer, "dm1", " nova ", "cliente mudou o briefing");
    expect(db.demand.update).toHaveBeenCalledWith({ where: { id: "dm1" }, data: { description: "nova" } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DEMAND_UPDATED",
        entityId: "dm1",
        newValue: { field: "description", previous: "antiga", new: "nova", reason: "cliente mudou o briefing" },
      })
    );
  });

  it("recusa descrição igual, cliente externo e demanda sem acesso", async () => {
    db.demand.findUnique.mockResolvedValue({ description: "igual" });
    await expect(updateDemandDescription(designer, "dm1", "igual")).rejects.toThrow(/não mudou/);
    await expect(updateDemandDescription(external, "dm1", "x")).rejects.toThrow(/permissão/);
    guardDemand.mockResolvedValue({ ok: false, error: "Demanda não encontrada." });
    await expect(updateDemandDescription(designer, "dm9", "x")).rejects.toThrow("Demanda não encontrada.");
    expect(db.demand.update).not.toHaveBeenCalled();
  });
});

describe("listDemandHistory", () => {
  it("devolve só prazo e descrição, e nada sem acesso", async () => {
    db.auditLog.findMany.mockResolvedValue([
      { id: "1", action: "DEADLINE_CHANGED", createdAt: new Date(), user: { name: "Ana" }, newValue: { field: "dueDate", previous: null, new: "2026-10-20T12:00:00.000Z" } },
      { id: "2", action: "DEMAND_UPDATED", createdAt: new Date(), user: null, newValue: { field: "title" } },
    ]);
    const entries = await listDemandHistory(designer, "dm1");
    expect(entries.map((e) => e.id)).toEqual(["1"]);
    guardDemand.mockResolvedValue({ ok: false, error: "x" });
    expect(await listDemandHistory(designer, "dm1")).toEqual([]);
  });
});
