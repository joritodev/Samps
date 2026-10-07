import { describe, expect, it } from "vitest";
import {
  GUARD_DENIED,
  GUARD_NOT_FOUND,
  GUARD_STATUS,
  evaluateDemandAccess,
  type GuardActor,
  type GuardedDemand,
} from "./demand-guard";

const demand: GuardedDemand = {
  id: "d1",
  clientId: "c1",
  boardId: "b1",
  status: "DEMANDED",
  assigneeId: null,
  sectorId: "design",
};
const designer: GuardActor = {
  id: "u-design",
  permissions: ["clients.view_assigned", "demands.edit"],
  clientIds: ["c1"],
  sectorId: "design",
};
const external: GuardActor = { id: "u-ext", permissions: ["portal.view"], clientIds: ["c1"], sectorId: null };
const manager: GuardActor = { id: "u-m", permissions: ["clients.view_all", "demands.edit", "demands.assign"], clientIds: [], sectorId: null };

describe("evaluateDemandAccess", () => {
  it("quem executa e enxerga o cliente passa", () => {
    expect(evaluateDemandAccess(designer, demand, { permission: "demands.edit" })).toBeNull();
  });

  it("sem vínculo com o cliente responde 'não encontrada'", () => {
    const stranger = { ...designer, clientIds: ["c2"] };
    expect(evaluateDemandAccess(stranger, demand, { permission: "demands.edit" })).toBe(GUARD_NOT_FOUND);
  });

  it("cliente externo não passa onde se exige demands.edit, mesmo vinculado", () => {
    expect(evaluateDemandAccess(external, demand, { permission: "demands.edit" })).toBe(GUARD_DENIED);
  });

  it("status fora da lista é recusado, com a mensagem pedida", () => {
    const published = { ...demand, status: "PUBLISHED" as const };
    expect(evaluateDemandAccess(designer, published, { statuses: ["DEMANDED", "AVAILABLE"] })).toBe(GUARD_STATUS);
    expect(evaluateDemandAccess(designer, published, { statuses: ["DEMANDED"], statusError: "Já publicada." })).toBe("Já publicada.");
  });

  it("'assignee' exige ser o responsável, a não ser que possa reatribuir", () => {
    const mine = { ...demand, assigneeId: designer.id };
    expect(evaluateDemandAccess(designer, mine, { who: "assignee" })).toBeNull();
    expect(evaluateDemandAccess(designer, { ...demand, assigneeId: "outro" }, { who: "assignee" })).toBe(GUARD_DENIED);
    expect(evaluateDemandAccess(manager, { ...demand, assigneeId: "outro" }, { who: "assignee" })).toBeNull();
  });

  it("'sector' exige ser do setor da demanda, a não ser que possa reatribuir", () => {
    expect(evaluateDemandAccess(designer, demand, { who: "sector" })).toBeNull();
    expect(evaluateDemandAccess({ ...designer, sectorId: "video" }, demand, { who: "sector" })).toBe(GUARD_DENIED);
    expect(evaluateDemandAccess({ ...designer, sectorId: null }, { ...demand, sectorId: null }, { who: "sector" })).toBe(GUARD_DENIED);
    expect(evaluateDemandAccess(manager, demand, { who: "sector" })).toBeNull();
  });

  it("quem vê todos os clientes alcança qualquer demanda", () => {
    expect(evaluateDemandAccess(manager, { ...demand, clientId: "qualquer" }, { permission: "demands.edit" })).toBeNull();
  });
});
