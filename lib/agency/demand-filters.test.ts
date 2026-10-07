import { describe, expect, it } from "vitest";
import { assigneeHref, demandFilter, demandFilterHref, FLOW_STAGES } from "./demand-filters";

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

  it("sem responsável: assigneeId nulo, só de demanda já demandada (briefing não conta)", () => {
    expect(demandFilter("sem-responsavel", now)?.where).toEqual({
      assigneeId: null,
      status: {
        notIn: [
          "DONE", "CANCELLED", "PUBLISHED",
          "BACKLOG", "PENDING_PLANNING", "PLANNING", "OPEN",
        ],
      },
    });
  });

  it("ajustes é retorno da revisão, não etapa do fluxo", () => {
    expect(FLOW_STAGES.map((s) => s.key)).not.toContain("ajustes");
    expect(demandFilter("ajustes", now)?.where).toEqual({ status: "ADJUSTMENTS" });
    const producao = FLOW_STAGES.find((s) => s.key === "producao");
    expect(producao?.statuses).toContain("ADJUSTMENTS");
  });

  it("concluídas hoje: a partir da meia-noite local, da aprovação em diante", () => {
    const where = demandFilter("concluidas-hoje", now)?.where as {
      updatedAt: { gte: Date };
      status: { in: string[] };
    };
    expect(where.updatedAt.gte.getHours()).toBe(0);
    expect(where.updatedAt.gte.getDate()).toBe(29);
    expect(where.status.in).toEqual(
      expect.arrayContaining(["APPROVED", "SCHEDULED", "PUBLISHED", "DONE"])
    );
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
    expect(assigneeHref("u 1")).toBe("/demandas?responsavel=u%201");
  });
});
