import type { BoardColumn, BoardDemand } from "@/types/board-ui";

export const UNASSIGNED = "none";

export type DueFilter = "overdue" | "week" | "none";

export type BoardFilters = {
  client: string[];
  assignee: string[];
  sector: string[];
  priority: string[];
  due: DueFilter | null;
};

export const EMPTY_FILTERS: BoardFilters = {
  client: [],
  assignee: [],
  sector: [],
  priority: [],
  due: null,
};

const LIST_KEYS = ["client", "assignee", "sector", "priority"] as const;
const DUE_VALUES: DueFilter[] = ["overdue", "week", "none"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function countFilters(filters: BoardFilters): number {
  return (
    LIST_KEYS.reduce((sum, key) => sum + filters[key].length, 0) +
    (filters.due ? 1 : 0)
  );
}

export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function matchesDue(demand: BoardDemand, due: DueFilter, now: Date) {
  if (due === "none") return !demand.dueDate;
  if (!demand.dueDate) return false;
  const time = new Date(demand.dueDate).getTime();
  if (due === "overdue") return time < now.getTime();
  return time >= now.getTime() && time <= now.getTime() + WEEK_MS;
}

export function matchesFilters(
  demand: BoardDemand,
  filters: BoardFilters,
  now: Date = new Date()
): boolean {
  const { client, assignee, sector, priority, due } = filters;
  if (client.length && !client.includes(demand.clientId ?? "")) return false;
  if (assignee.length && !assignee.includes(demand.assigneeId ?? UNASSIGNED)) {
    return false;
  }
  if (sector.length && !sector.includes(demand.sector ?? "")) return false;
  if (priority.length && !priority.includes(demand.priority)) return false;
  if (due && !matchesDue(demand, due, now)) return false;
  return true;
}

export function filterColumns(
  columns: BoardColumn[],
  filters: BoardFilters,
  now: Date = new Date()
): BoardColumn[] {
  if (countFilters(filters) === 0) return columns;
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => matchesFilters(card, filters, now)),
  }));
}

export type FilterOption = { value: string; label: string };

export type FilterOptions = {
  client: FilterOption[];
  assignee: FilterOption[];
  sector: FilterOption[];
  priority: FilterOption[];
};

function sortByLabel(options: Map<string, string>): FilterOption[] {
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
  );
}

/** Opções vêm só do que está nos cards: nunca oferece filtro que zera o quadro. */
export function buildFilterOptions(columns: BoardColumn[]): FilterOptions {
  const client = new Map<string, string>();
  const assignee = new Map<string, string>();
  const sector = new Map<string, string>();
  const priority = new Map<string, string>();
  let hasUnassigned = false;

  for (const card of columns.flatMap((c) => c.cards)) {
    if (card.clientId) client.set(card.clientId, card.clientName);
    if (card.assigneeId) assignee.set(card.assigneeId, card.assigneeName ?? "—");
    else hasUnassigned = true;
    if (card.sector) sector.set(card.sector, card.sector);
    if (card.priority) priority.set(card.priority, card.priority);
  }

  const assignees = sortByLabel(assignee);
  if (hasUnassigned) assignees.unshift({ value: UNASSIGNED, label: "Sem responsável" });

  return {
    client: sortByLabel(client),
    assignee: assignees,
    sector: sortByLabel(sector),
    priority: sortByLabel(priority),
  };
}

export function parseFilters(params: URLSearchParams): BoardFilters {
  const list = (key: string) => params.getAll(key).filter(Boolean);
  const due = params.get("prazo") as DueFilter | null;
  return {
    client: list("cliente"),
    assignee: list("resp"),
    sector: list("setor"),
    priority: list("prioridade"),
    due: due && DUE_VALUES.includes(due) ? due : null,
  };
}

const PARAM_BY_KEY = {
  client: "cliente",
  assignee: "resp",
  sector: "setor",
  priority: "prioridade",
} as const;

/** Reescreve só os parâmetros dos filtros; `?filtro=`, `?abrir=` etc. ficam. */
export function applyFiltersToParams(
  params: URLSearchParams,
  filters: BoardFilters
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  for (const key of LIST_KEYS) {
    next.delete(PARAM_BY_KEY[key]);
    for (const value of filters[key]) next.append(PARAM_BY_KEY[key], value);
  }
  next.delete("prazo");
  if (filters.due) next.set("prazo", filters.due);
  return next;
}
