import { describe, expect, it } from "vitest";
import {
  canDragCard,
  parseMoveInput,
  parsePlanCardInput,
  statusAfterMove,
  type PlanCardInput,
} from "./card-input";

const base: PlanCardInput = {
  title: "Vídeo 1",
  kind: "video",
  category: "Orgânico",
  durationHours: 2,
};
const ok = (input: PlanCardInput, sector: "video" | "design" = "video") => {
  const result = parsePlanCardInput(input, sector);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};
const err = (input: PlanCardInput, sector: "video" | "design" = "video") => {
  const result = parsePlanCardInput(input, sector);
  return result.ok ? null : result.error;
};

describe("parsePlanCardInput", () => {
  it("card simples vai para o backlog como não alocado", () => {
    expect(ok({ ...base, status: "PROGRAMADO" })).toMatchObject({
      status: "NAO_ALOCADO",
      weekday: null,
      memberId: null,
      pinned: false,
    });
  });

  it("alocado com status 'não alocado' vira programado; concluído é mantido", () => {
    expect(ok({ ...base, weekday: 2, memberId: "m1", status: "NAO_ALOCADO" }).status).toBe(
      "PROGRAMADO",
    );
    expect(ok({ ...base, weekday: 2, memberId: "m1", status: "CONCLUIDO" }).status).toBe(
      "CONCLUIDO",
    );
  });

  it("sem dia ou sem pessoa volta ao backlog, mesmo concluído", () => {
    expect(ok({ ...base, weekday: 2, status: "CONCLUIDO" }).status).toBe("NAO_ALOCADO");
    expect(ok({ ...base, memberId: "m1", status: "REVISAO" }).status).toBe("NAO_ALOCADO");
  });

  it("fixo semanal exige dia e pessoa, trava o card e apaga o prazo", () => {
    expect(err({ ...base, recurring: true })).toMatch(/dia e o responsável/);
    expect(err({ ...base, recurring: true, weekday: 2 })).toMatch(/dia e o responsável/);
    const value = ok({
      ...base,
      recurring: true,
      weekday: 2,
      memberId: "m1",
      dueDate: "2026-09-10",
    });
    expect(value).toMatchObject({ pinned: true, recurring: true, dueDate: null });
  });

  it("valida nome, tipo e categoria pelo setor", () => {
    expect(err({ ...base, title: "   " })).toMatch(/nome do card/);
    expect(err({ ...base, title: "x".repeat(121) })).toMatch(/120/);
    expect(err({ ...base, kind: "peca" })).toMatch(/tipo/);
    expect(ok({ ...base, kind: "peca", category: "Lançamento" }, "design").kind).toBe("peca");
    expect(err({ ...base, category: "Lançamento" })).toMatch(/categoria/);
  });

  it("duração entre 1 minuto e 24h, com 4 casas", () => {
    expect(err({ ...base, durationHours: 0 })).toMatch(/duração/);
    expect(err({ ...base, durationHours: 25 })).toMatch(/duração/);
    expect(err({ ...base, durationHours: Number.NaN })).toMatch(/duração/);
    expect(ok({ ...base, durationHours: 7 / 60 }).durationHours).toBe(0.1167);
  });

  it("dia só de segunda a sábado", () => {
    expect(err({ ...base, weekday: 0 })).toMatch(/segunda a sábado/);
    expect(err({ ...base, weekday: 7 })).toMatch(/segunda a sábado/);
    expect(err({ ...base, weekday: 1.5 })).toMatch(/segunda a sábado/);
  });

  it("prazo precisa ser data real", () => {
    expect(err({ ...base, dueDate: "2026-02-31" })).toMatch(/inválida/);
    expect(ok({ ...base, dueDate: "2026-09-10" }).dueDate).toBe("2026-09-10");
  });

  it("cliente cadastrado anula o texto livre; texto livre é aparado e limitado", () => {
    expect(ok({ ...base, clientId: "c1", clientName: "digitado" })).toMatchObject({
      clientId: "c1",
      clientName: null,
    });
    expect(ok({ ...base, clientName: "  COCO BAMBU " }).clientName).toBe("COCO BAMBU");
    expect(err({ ...base, clientName: "x".repeat(81) })).toMatch(/80/);
  });

  it("observação é aparada e limitada; status inválido é recusado", () => {
    expect(ok({ ...base, notes: "  oi " }).notes).toBe("oi");
    expect(ok({ ...base, notes: "   " }).notes).toBeNull();
    expect(err({ ...base, notes: "x".repeat(501) })).toMatch(/500/);
    expect(err({ ...base, status: "FEITO" })).toMatch(/status/);
  });
});

describe("parseMoveInput", () => {
  const to = { memberId: "m1", weekday: 2, isoYear: 2026, isoWeek: 37 };
  it("aceita mover para coluna ou voltar ao backlog", () => {
    expect(
      parseMoveInput({ cardId: "a", to, orderedIds: ["b", "a"], fromOrderedIds: ["c"] }).ok,
    ).toBe(true);
    expect(parseMoveInput({ cardId: "a", to: null, orderedIds: ["a"], fromOrderedIds: [] }).ok).toBe(
      true,
    );
  });
  it("recusa ordem sem o card, ids repetidos e destino inválido", () => {
    expect(
      parseMoveInput({ cardId: "a", to, orderedIds: ["b"], fromOrderedIds: [] }).ok,
    ).toBe(false);
    expect(
      parseMoveInput({ cardId: "a", to, orderedIds: ["a", "b"], fromOrderedIds: ["b"] }).ok,
    ).toBe(false);
    expect(
      parseMoveInput({
        cardId: "a",
        to: { ...to, weekday: 7 },
        orderedIds: ["a"],
        fromOrderedIds: [],
      }).ok,
    ).toBe(false);
    expect(
      parseMoveInput({
        cardId: "a",
        to: { ...to, isoWeek: 60 },
        orderedIds: ["a"],
        fromOrderedIds: [],
      }).ok,
    ).toBe(false);
  });
});

describe("regras de movimento", () => {
  it("fixo e recorrente não arrastam", () => {
    expect(canDragCard({ pinned: false, recurring: false })).toBe(true);
    expect(canDragCard({ pinned: true, recurring: false })).toBe(false);
    expect(canDragCard({ pinned: false, recurring: true })).toBe(false);
  });
  it("status depois de mover", () => {
    expect(statusAfterMove("NAO_ALOCADO", true)).toBe("PROGRAMADO");
    expect(statusAfterMove("REVISAO", true)).toBe("REVISAO");
    expect(statusAfterMove("CONCLUIDO", false)).toBe("NAO_ALOCADO");
  });
});
