import { describe, expect, it } from "vitest";
import {
  BACKLOG,
  clampColumnWidth,
  computeWeekTotals,
  containerKey,
  fittedColumnWidth,
  formatWeekParam,
  groupCards,
  parseContainerKey,
  parseWeekParam,
  zoomPercent,
} from "./board";
import type { PlanCardData, PlanMemberData } from "./types";

const member = (id: string): PlanMemberData => ({
  id,
  userId: `u-${id}`,
  name: id,
  color: "#000",
  defaultCapacityHours: 6,
  sortOrder: 0,
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

describe("containerKey", () => {
  it("ida e volta, inclusive com ids que contêm dois-pontos", () => {
    expect(parseContainerKey(containerKey("leo", 3))).toEqual({ memberId: "leo", weekday: 3 });
    expect(parseContainerKey(containerKey("a:b", 6))).toEqual({ memberId: "a:b", weekday: 6 });
  });
  it("backlog e chaves inválidas não viram coluna", () => {
    expect(parseContainerKey(BACKLOG)).toBeNull();
    expect(parseContainerKey("leo:9")).toBeNull();
    expect(parseContainerKey("leo")).toBeNull();
    expect(parseContainerKey(":3")).toBeNull();
  });
});

describe("groupCards", () => {
  it("separa backlog e colunas e ordena por position", () => {
    const groups = groupCards([
      card({ id: "b", weekday: 1, memberId: "leo", position: 2 }),
      card({ id: "a", weekday: 1, memberId: "leo", position: 1 }),
      card({ id: "solto" }),
      card({ id: "semDia", memberId: "leo" }),
      card({ id: "semPessoa", weekday: 2 }),
    ]);
    expect(groups.get(containerKey("leo", 1))!.map((c) => c.id)).toEqual(["a", "b"]);
    expect(groups.get(BACKLOG)!.map((c) => c.id).sort()).toEqual(["semDia", "semPessoa", "solto"]);
  });
});

describe("computeWeekTotals", () => {
  const params = {
    week: { year: 2026, week: 37 },
    members: [member("leo"), member("mab")],
    overrides: [],
    blocks: [],
    defaultKind: "video",
    kinds: [
      { value: "video", label: "Vídeo" },
      { value: "captacao", label: "Captação" },
      { value: "roteiro", label: "Roteiro" },
    ],
  };

  it("capacidade = padrão × 6 dias por pessoa; ocupado soma só cards alocados da semana", () => {
    const totals = computeWeekTotals({
      ...params,
      cards: [
        card({ id: "a", weekday: 1, memberId: "leo", durationHours: 2 }),
        card({ id: "b", weekday: 2, memberId: "leo", kind: "captacao", durationHours: 3 }),
        card({ id: "c", weekday: 1, memberId: "mab", durationHours: 1 }),
        card({ id: "backlog" }),
        card({ id: "outraSemana", weekday: 1, memberId: "leo", isoWeek: 38 }),
      ],
    });
    expect(totals.capacity).toBe(72);
    expect(totals.used).toBe(6);
    expect(totals.free).toBe(66);
    expect(totals.items).toBe(2);
    expect(totals.perMember[0]).toMatchObject({ used: 5, capacity: 36, items: 1 });
    expect(totals.byKind).toEqual([
      { label: "Vídeo", count: 2, hours: 3 },
      { label: "Captação", count: 1, hours: 3 },
    ]);
  });

  it("dia bloqueado e ausência reduzem a capacidade", () => {
    const totals = computeWeekTotals({
      ...params,
      cards: [],
      blocks: [
        { id: "b", isoYear: 2026, isoWeek: 37, weekday: 3, memberId: null, reason: "Feriado" },
      ],
      isAbsent: (id, key) => id === "mab" && key === "2026-09-08",
    });
    expect(totals.perMember[0]!.capacity).toBe(30);
    expect(totals.perMember[1]!.capacity).toBe(24);
  });

  it("sobrecarga aparece como livre negativo", () => {
    const totals = computeWeekTotals({
      ...params,
      members: [member("leo")],
      cards: [card({ id: "a", weekday: 1, memberId: "leo", durationHours: 40 })],
    });
    expect(totals.free).toBeLessThan(0);
  });
});

describe("parâmetro de semana", () => {
  it("aceita AAAA-S e AAAA-SS dentro do ano", () => {
    expect(parseWeekParam("2026-37")).toEqual({ year: 2026, week: 37 });
    expect(parseWeekParam("2026-5")).toEqual({ year: 2026, week: 5 });
    expect(parseWeekParam("2026-53")).toEqual({ year: 2026, week: 53 });
  });
  it("rejeita lixo, semana 53 de ano de 52 e anos absurdos", () => {
    expect(parseWeekParam("2027-53")).toBeNull();
    expect(parseWeekParam("2026-0")).toBeNull();
    expect(parseWeekParam("2026-54")).toBeNull();
    expect(parseWeekParam("1999-10")).toBeNull();
    expect(parseWeekParam("abc")).toBeNull();
    expect(parseWeekParam(undefined)).toBeNull();
  });
  it("formata de volta", () => {
    expect(formatWeekParam({ year: 2026, week: 5 })).toBe("2026-05");
    expect(parseWeekParam(formatWeekParam({ year: 2026, week: 5 }))).toEqual({
      year: 2026,
      week: 5,
    });
  });
});

describe("largura das colunas", () => {
  it("zoom padrão é 100% e fica entre os limites", () => {
    expect(zoomPercent(420)).toBe(100);
    expect(clampColumnWidth(100)).toBe(240);
    expect(clampColumnWidth(900)).toBe(520);
  });
  it("semana inteira divide a largura pelos 6 dias com folga mínima", () => {
    expect(fittedColumnWidth(1272)).toBe(202);
    expect(fittedColumnWidth(100)).toBe(180);
    expect(fittedColumnWidth(9000)).toBe(720);
  });
});
