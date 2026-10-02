import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  UNASSIGNED,
  applyFiltersToParams,
  buildFilterOptions,
  countFilters,
  filterColumns,
  matchesFilters,
  parseFilters,
  toggleValue,
} from "./board-filters";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

const NOW = new Date("2026-10-02T12:00:00Z");

function demand(over: Partial<BoardDemand> = {}): BoardDemand {
  return {
    id: "d1",
    title: "Post",
    description: null,
    status: "IN_PRODUCTION",
    priority: "Alta",
    sector: "Social",
    dueDate: null,
    materialUrl: null,
    publishedUrl: null,
    briefingLockedAt: null,
    clientName: "Acme",
    clientId: "c1",
    assigneeId: "u1",
    assigneeName: "Ana",
    ...over,
  };
}

describe("matchesFilters", () => {
  it("sem filtros aceita tudo", () => {
    expect(matchesFilters(demand(), EMPTY_FILTERS, NOW)).toBe(true);
  });

  it("combina grupos com E e valores do mesmo grupo com OU", () => {
    const f = { ...EMPTY_FILTERS, client: ["c1", "c2"], priority: ["Alta"] };
    expect(matchesFilters(demand({ clientId: "c2" }), f, NOW)).toBe(true);
    expect(matchesFilters(demand({ clientId: "c3" }), f, NOW)).toBe(false);
    expect(matchesFilters(demand({ priority: "Baixa" }), f, NOW)).toBe(false);
  });

  it("filtra sem responsável", () => {
    const f = { ...EMPTY_FILTERS, assignee: [UNASSIGNED] };
    expect(matchesFilters(demand({ assigneeId: null }), f, NOW)).toBe(true);
    expect(matchesFilters(demand(), f, NOW)).toBe(false);
  });

  it("filtra por prazo", () => {
    const late = demand({ dueDate: "2026-10-01T00:00:00Z" });
    const soon = demand({ dueDate: "2026-10-05T00:00:00Z" });
    const far = demand({ dueDate: "2026-11-05T00:00:00Z" });
    const none = demand();
    const overdue = { ...EMPTY_FILTERS, due: "overdue" as const };
    const week = { ...EMPTY_FILTERS, due: "week" as const };
    const noDue = { ...EMPTY_FILTERS, due: "none" as const };
    expect(matchesFilters(late, overdue, NOW)).toBe(true);
    expect(matchesFilters(soon, overdue, NOW)).toBe(false);
    expect(matchesFilters(soon, week, NOW)).toBe(true);
    expect(matchesFilters(far, week, NOW)).toBe(false);
    expect(matchesFilters(none, week, NOW)).toBe(false);
    expect(matchesFilters(none, noDue, NOW)).toBe(true);
    expect(matchesFilters(soon, noDue, NOW)).toBe(false);
  });
});

describe("filterColumns", () => {
  const columns: BoardColumn[] = [
    { id: "a", title: "A", cards: [demand({ id: "1" }), demand({ id: "2", sector: "Design" })] },
  ];

  it("devolve as mesmas colunas sem filtros", () => {
    expect(filterColumns(columns, EMPTY_FILTERS, NOW)).toBe(columns);
  });

  it("mantém as colunas e filtra os cards", () => {
    const out = filterColumns(columns, { ...EMPTY_FILTERS, sector: ["Design"] }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].cards.map((c) => c.id)).toEqual(["2"]);
  });
});

describe("buildFilterOptions", () => {
  it("lista só o que existe nos cards, em ordem alfabética", () => {
    const columns: BoardColumn[] = [
      {
        id: "a",
        title: "A",
        cards: [
          demand({ id: "1", assigneeId: null, assigneeName: null }),
          demand({ id: "2", clientId: "c2", clientName: "Beta", assigneeId: "u2", assigneeName: "Bia" }),
        ],
      },
    ];
    const o = buildFilterOptions(columns);
    expect(o.client.map((x) => x.label)).toEqual(["Acme", "Beta"]);
    expect(o.assignee[0]).toEqual({ value: UNASSIGNED, label: "Sem responsável" });
    expect(o.assignee.map((x) => x.label)).toEqual(["Sem responsável", "Bia"]);
  });
});

describe("URL", () => {
  it("ida e volta", () => {
    const filters = {
      client: ["c1"],
      assignee: ["u1", UNASSIGNED],
      sector: ["Social"],
      priority: [],
      due: "week" as const,
    };
    const params = applyFiltersToParams(new URLSearchParams("filtro=atrasadas"), filters);
    expect(params.get("filtro")).toBe("atrasadas");
    expect(parseFilters(params)).toEqual(filters);
    expect(countFilters(filters)).toBe(5);
  });

  it("limpar remove os parâmetros e ignora prazo inválido", () => {
    const params = applyFiltersToParams(new URLSearchParams("cliente=c1&prazo=week"), EMPTY_FILTERS);
    expect(params.toString()).toBe("");
    expect(parseFilters(new URLSearchParams("prazo=xx")).due).toBeNull();
  });
});

describe("toggleValue", () => {
  it("alterna", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});
