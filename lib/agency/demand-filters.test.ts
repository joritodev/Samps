import { describe, expect, it } from "vitest";
import { demandFilter, demandFilterHref, FLOW_STAGES } from "./demand-filters";

const now = new Date("2026-09-29T15:00:00");

describe("demandFilter", () => {
  it("ignora chave vazia ou desconhecida", () => {
    expect(demandFilter(undefined)).toBeNull();
    expect(demandFilter("qualquer")).toBeNull();
  });

  it("atrasadas: aberta e com prazo vencido", () => {
    const f = demandFilter("atrasadas", now);
    expect(f?.label).toBe("Atrasadas");
    expect(f?.where).toMatchObject({ dueDate: { lt: now } });
    expect(f?.where.status).toMatchObject({ notIn: ["DONE", "CANCELLED", "PUBLISHED"] });
  });

  it("sem responsável: assigneeId nulo", () => {
    expect(demandFilter("sem-responsavel", now)?.where).toMatchObject({ assigneeId: null });
  });

  it("concluídas hoje: a partir da meia-noite local", () => {
    const where = demandFilter("concluidas-hoje", now)?.where as {
      updatedAt: { gte: Date };
    };
    expect(where.updatedAt.gte.getHours()).toBe(0);
    expect(where.updatedAt.gte.getDate()).toBe(29);
  });

  it("cada etapa do fluxo vira filtro por status", () => {
    for (const stage of FLOW_STAGES) {
      const f = demandFilter(stage.key, now);
      expect(f?.label).toBe(stage.label);
      expect(f?.where).toEqual({ status: { in: [...stage.statuses] } });
    }
  });

  it("monta o link do quadro geral", () => {
    expect(demandFilterHref("atrasadas")).toBe("/demandas?filtro=atrasadas");
  });
});
