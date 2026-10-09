import { describe, expect, it } from "vitest";
import { deadlineWeekday, suggestDistribution } from "./distribution";
import type { PlanCardData, PlanMemberData } from "./types";

const member = (id: string, order: number, hours = 6): PlanMemberData => ({
  id,
  userId: `u-${id}`,
  name: id,
  color: "#000",
  defaultCapacityHours: hours,
  sortOrder: order,
  active: true,
});

const card = (c: Partial<PlanCardData> & { id: string }): PlanCardData => ({
  isoYear: 2026,
  isoWeek: 37,
  weekday: null,
  memberId: null,
  kind: "video",
  clientId: null,
  clientName: null,
  demandId: null,
  templateId: null,
  title: c.id,
  category: "Orgânico",
  durationHours: 2,
  status: "NAO_ALOCADO",
  pinned: false,
  required: false,
  recurring: false,
  dueDate: null,
  notes: null,
  position: 0,
  ...c,
});

const TEAM = [member("leo", 1), member("mab", 2)];
// 09/09/2026 é quarta-feira (semana 37).
const TODAY = "2026-09-09";
const base = { team: TEAM, todayIso: TODAY, overrides: [], blocks: [] };

describe("deadlineWeekday", () => {
  it("converte o prazo em dia da semana (1-6)", () => {
    expect(deadlineWeekday({ dueDate: "2026-09-09" }, "2026-09-07")).toBe(3);
    expect(deadlineWeekday({ dueDate: "2026-09-12" }, "2026-09-07")).toBe(6);
  });
  it("vencido vale segunda; depois da semana vale sábado; sem prazo é null", () => {
    expect(deadlineWeekday({ dueDate: "2026-09-01" }, "2026-09-07")).toBe(1);
    expect(deadlineWeekday({ dueDate: "2026-10-01" }, "2026-09-07")).toBe(6);
    expect(deadlineWeekday({ dueDate: null }, "2026-09-07")).toBeNull();
  });
});

describe("suggestDistribution", () => {
  it("aloca o backlog na primeira vaga a partir de hoje", () => {
    const result = suggestDistribution({
      ...base,
      backlog: [card({ id: "a" })],
      allocatedCards: [],
    });
    expect(result.unplaced).toEqual([]);
    expect(result.moves).toHaveLength(1);
    expect(result.moves[0]!.toDate).toBe("2026-09-09");
    expect(result.moves[0]!.toWeekday).toBe(3);
  });

  it("nunca coloca card em dia anterior a hoje", () => {
    const result = suggestDistribution({
      ...base,
      backlog: [card({ id: "a" }), card({ id: "b" }), card({ id: "c" })],
      allocatedCards: [],
    });
    for (const move of result.moves) expect(move.toDate >= TODAY).toBe(true);
  });

  it("respeita a capacidade: 3 cards de 4h não cabem os três num dia de 6h por pessoa", () => {
    const result = suggestDistribution({
      ...base,
      backlog: ["a", "b", "c"].map((id) => card({ id, durationHours: 4 })),
      allocatedCards: [],
    });
    const perSlot = new Map<string, number>();
    for (const m of result.moves) {
      const key = `${m.toMemberId}-${m.toDate}`;
      perSlot.set(key, (perSlot.get(key) ?? 0) + m.card.durationHours);
    }
    Array.from(perSlot.values()).forEach((hours) => expect(hours).toBeLessThanOrEqual(6));
  });

  it("desconta o que já está alocado no dia", () => {
    const result = suggestDistribution({
      ...base,
      team: [member("leo", 1)],
      backlog: [card({ id: "novo", durationHours: 3 })],
      allocatedCards: [
        card({
          id: "fixo",
          weekday: 3,
          memberId: "leo",
          durationHours: 5,
          status: "PROGRAMADO",
        }),
      ],
    });
    // quarta tem só 1h livre, então vai para quinta
    expect(result.moves[0]!.toDate).toBe("2026-09-10");
  });

  it("não usa dia bloqueado nem pessoa ausente", () => {
    const result = suggestDistribution({
      ...base,
      blocks: [
        { id: "b", isoYear: 2026, isoWeek: 37, weekday: 3, memberId: null, reason: "Feriado" },
      ],
      isAbsent: (id, key) => id === "leo" && key === "2026-09-10",
      backlog: [card({ id: "a" })],
      allocatedCards: [],
    });
    const move = result.moves[0]!;
    expect(move.toDate).toBe("2026-09-10");
    expect(move.toMemberId).toBe("mab");
  });

  it("respeita a pessoa do card e o prazo", () => {
    const result = suggestDistribution({
      ...base,
      backlog: [card({ id: "a", memberId: "mab", dueDate: "2026-09-10" })],
      allocatedCards: [],
    });
    expect(result.moves[0]!.toMemberId).toBe("mab");
    expect(result.moves[0]!.toDate <= "2026-09-10").toBe(true);
  });

  it("prazo impossível devolve o card como não alocado", () => {
    const result = suggestDistribution({
      ...base,
      backlog: [card({ id: "a", dueDate: "2026-09-01" })],
      allocatedCards: [],
    });
    expect(result.moves).toEqual([]);
    expect(result.unplaced.map((c) => c.id)).toEqual(["a"]);
  });

  it("obrigatório e prazo mais curto passam na frente", () => {
    const result = suggestDistribution({
      ...base,
      team: [member("leo", 1, 2)],
      backlog: [
        card({ id: "livre" }),
        card({ id: "prazo", dueDate: "2026-09-10" }),
        card({ id: "obrig", required: true }),
      ],
      allocatedCards: [],
      horizonDays: 7,
    });
    expect(result.moves.map((m) => m.card.id).slice(0, 2)).toEqual(["obrig", "prazo"]);
  });

  it("não distribui sábado e domingo além do quadro: sábado conta, domingo não", () => {
    const result = suggestDistribution({
      ...base,
      team: [member("leo", 1, 2)],
      todayIso: "2026-09-12",
      backlog: [card({ id: "a" }), card({ id: "b" })],
      allocatedCards: [],
    });
    expect(result.moves[0]!.toWeekday).toBe(6);
    expect(result.moves[1]!.toWeekday).toBe(1);
    expect(result.moves[1]!.toDate).toBe("2026-09-14");
  });

  it("modo flexível não mexe em fixos nem em captação", () => {
    const fixed = card({
      id: "fixo",
      weekday: 3,
      memberId: "leo",
      pinned: true,
      status: "PROGRAMADO",
      durationHours: 6,
    });
    const cap = card({
      id: "cap",
      kind: "captacao",
      weekday: 3,
      memberId: "mab",
      status: "PROGRAMADO",
      durationHours: 6,
    });
    const result = suggestDistribution({
      ...base,
      backlog: [card({ id: "a" })],
      allocatedCards: [fixed, cap],
      relaxed: true,
    });
    expect(result.moves.some((m) => ["fixo", "cap"].includes(m.card.id))).toBe(false);
  });

  it("variantes mudam a escolha de pessoa sem quebrar a capacidade", () => {
    const run = (variant: number) =>
      suggestDistribution({
        ...base,
        backlog: [card({ id: "a", durationHours: 1 })],
        allocatedCards: [],
        variant,
      }).moves[0]!.toMemberId;
    expect(["leo", "mab"]).toContain(run(0));
    expect(["leo", "mab"]).toContain(run(1));
  });

  it("card fixo devolvido ao backlog busca vaga na semana de origem", () => {
    const result = suggestDistribution({
      ...base,
      todayIso: "2026-09-10",
      backlog: [
        card({ id: "fixo", recurring: true, pinned: true, isoYear: 2026, isoWeek: 37, durationHours: 1 }),
      ],
      allocatedCards: [],
    });
    expect(result.moves[0]!.toYear).toBe(2026);
    expect(result.moves[0]!.toWeek).toBe(37);
  });
});
