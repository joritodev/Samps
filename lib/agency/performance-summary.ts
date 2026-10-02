import { SMALL_SAMPLE_N, mean, onTimeRate } from "@/lib/agency/performance-math";
import { DAY_MS, dayKey, startOfDayMs } from "@/lib/agency/sp-calendar";

export type KpiKey =
  | "COMPLETED"
  | "ON_TIME_RATE"
  | "OVERDUE"
  | "REWORK_RATE"
  | "ADJUSTMENTS"
  | "WORKED_HOURS"
  | "AVG_LEAD_TIME_DAYS"
  | "UNASSIGNED_OPEN";

export type KpiUnit = "count" | "percent" | "hours" | "days";
export type KpiDirection = "higher" | "lower";

/**
 * Catálogo de indicadores. `snapshot` marca o que só existe "agora" (sem
 * histórico no banco), então não tem comparação com o período anterior.
 * `percent` guarda razão de 0 a 1.
 */
export const KPI_CATALOG: Record<
  KpiKey,
  { label: string; unit: KpiUnit; direction: KpiDirection; snapshot: boolean }
> = {
  COMPLETED: { label: "Concluídas", unit: "count", direction: "higher", snapshot: false },
  ON_TIME_RATE: { label: "No prazo", unit: "percent", direction: "higher", snapshot: false },
  OVERDUE: { label: "Atrasadas", unit: "count", direction: "lower", snapshot: true },
  REWORK_RATE: { label: "Retrabalho", unit: "percent", direction: "lower", snapshot: false },
  ADJUSTMENTS: { label: "Em ajuste", unit: "count", direction: "lower", snapshot: true },
  WORKED_HOURS: { label: "Tempo trabalhado", unit: "hours", direction: "higher", snapshot: false },
  AVG_LEAD_TIME_DAYS: { label: "Tempo até concluir", unit: "days", direction: "lower", snapshot: false },
  UNASSIGNED_OPEN: { label: "Sem responsável", unit: "count", direction: "lower", snapshot: true },
};

export const KPI_KEYS = Object.keys(KPI_CATALOG) as KpiKey[];

// ---------------------------------------------------------------- calendário
export type DateRange = { from: Date; to: Date };

/**
 * Período atual (alinhado a dias de São Paulo) e o anterior, de mesma
 * duração, logo antes dele.
 */
export function resolveComparisonRanges(
  range: DateRange,
  /** Período de comparação escolhido (ex.: o dia útil anterior). Padrão: o de mesma duração logo antes. */
  previousOverride?: DateRange
): {
  current: DateRange;
  previous: DateRange;
  days: number;
} {
  const fromMs = startOfDayMs(dayKey(range.from));
  const toStart = startOfDayMs(dayKey(range.to));
  const days = Math.max(1, Math.round((toStart - fromMs) / DAY_MS) + 1);
  const toMs = fromMs + days * DAY_MS - 1;
  const prevFrom = previousOverride ? startOfDayMs(dayKey(previousOverride.from)) : fromMs - days * DAY_MS;
  return {
    days,
    current: { from: new Date(fromMs), to: new Date(toMs) },
    previous: {
      from: new Date(prevFrom),
      to: new Date(prevFrom + days * DAY_MS - 1),
    },
  };
}

// ---------------------------------------------------------------- comparação
export type Trend = "better" | "worse" | "same" | "none";

export type Comparison = {
  delta: number | null;
  /** Variação relativa em % (inteiro). Nula sem base ou para razões. */
  deltaPct: number | null;
  trend: Trend;
};

const EPSILON = 1e-9;

export function compareValue(
  current: number | null,
  previous: number | null,
  direction: KpiDirection,
  unit: KpiUnit = "count"
): Comparison {
  if (current === null || previous === null) {
    return { delta: null, deltaPct: null, trend: "none" };
  }
  const delta = current - previous;
  if (Math.abs(delta) < EPSILON) return { delta: 0, deltaPct: 0, trend: "same" };
  const improved = direction === "higher" ? delta > 0 : delta < 0;
  const deltaPct =
    unit === "percent" || previous === 0
      ? null
      : Math.round((delta / previous) * 100);
  return { delta, deltaPct, trend: improved ? "better" : "worse" };
}

// ------------------------------------------------------------------- resumo
export type DeliveryRow = {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
  completedAt: Date;
  assignee: { id: string; name: string } | null;
  contentType: { id: string; name: string } | null;
  hadRework: boolean;
  activeSeconds: number;
};

export type Snapshot = {
  overdue: number;
  adjustments: number;
  unassignedOpen: number;
  overdueBySector: { sectorId: string | null; name: string; count: number }[];
};

export type KpiResult = Comparison & {
  key: KpiKey;
  label: string;
  unit: KpiUnit;
  direction: KpiDirection;
  snapshot: boolean;
  value: number | null;
  previous: number | null;
};

export type DailyPoint = { date: string; current: number; previous: number };

export type PerformanceSummary = {
  range: DateRange;
  previousRange: DateRange;
  indicators: Record<KpiKey, KpiResult>;
  topDeliverers: {
    userId: string;
    name: string;
    deliveries: number;
    onTimeRate: number | null;
  }[];
  slowestType: { name: string; avgSeconds: number; n: number } | null;
  overdueBySector: Snapshot["overdueBySector"];
  series: DailyPoint[];
  smallSample: boolean;
  headline: string;
};

type Window = {
  completed: number;
  onTime: number;
  withDueDate: number;
  rework: number;
  leadDays: number[];
};

function inRange(date: Date, range: DateRange) {
  return date >= range.from && date <= range.to;
}

function windowOf(rows: DeliveryRow[]): Window {
  const w: Window = { completed: rows.length, onTime: 0, withDueDate: 0, rework: 0, leadDays: [] };
  for (const row of rows) {
    if (row.dueDate) {
      w.withDueDate += 1;
      if (row.completedAt <= row.dueDate) w.onTime += 1;
    }
    if (row.hadRework) w.rework += 1;
    w.leadDays.push((row.completedAt.getTime() - row.createdAt.getTime()) / DAY_MS);
  }
  return w;
}

function ratio(part: number, whole: number) {
  return whole === 0 ? null : part / whole;
}

function buildSeries(
  current: DeliveryRow[],
  previous: DeliveryRow[],
  ranges: { current: DateRange; previous: DateRange; days: number }
): DailyPoint[] {
  const count = (rows: DeliveryRow[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = dayKey(row.completedAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const cur = count(current);
  const prev = count(previous);
  const startCur = ranges.current.from.getTime();
  const startPrev = ranges.previous.from.getTime();
  return Array.from({ length: ranges.days }, (_, i) => {
    const date = dayKey(new Date(startCur + i * DAY_MS + DAY_MS / 2));
    const prevDate = dayKey(new Date(startPrev + i * DAY_MS + DAY_MS / 2));
    return { date, current: cur.get(date) ?? 0, previous: prev.get(prevDate) ?? 0 };
  });
}

function result(
  key: KpiKey,
  value: number | null,
  previous: number | null
): KpiResult {
  const meta = KPI_CATALOG[key];
  const base = meta.snapshot ? null : previous;
  return {
    key,
    ...meta,
    value,
    previous: base,
    ...compareValue(value, base, meta.direction, meta.unit),
  };
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildHeadline(
  summary: Pick<PerformanceSummary, "indicators" | "overdueBySector">
): string {
  const { COMPLETED, OVERDUE, UNASSIGNED_OPEN } = summary.indicators;
  const done = COMPLETED.value ?? 0;
  const before = COMPLETED.previous ?? 0;
  const parts: string[] = [];

  if (done === 0 && before === 0) {
    parts.push("Nenhuma entrega no período nem no anterior.");
  } else if (COMPLETED.trend === "same") {
    parts.push(`Mesmo ritmo do período anterior (${plural(done, "entrega", "entregas")}).`);
  } else if (COMPLETED.deltaPct !== null) {
    const pct = Math.abs(COMPLETED.deltaPct);
    parts.push(
      `Entregas ${pct}% ${COMPLETED.trend === "better" ? "acima" : "abaixo"} do período anterior (${done} contra ${before}).`
    );
  } else {
    parts.push(`${plural(done, "entrega", "entregas")} no período, sem entregas no anterior.`);
  }

  const overdue = OVERDUE.value ?? 0;
  if (overdue > 0) {
    const top = summary.overdueBySector[0];
    const where = top && top.count > 0 && summary.overdueBySector.length > 1 ? `, ${top.count} em ${top.name}` : "";
    parts.push(`${plural(overdue, "atrasada", "atrasadas")}${where}.`);
  }
  const unassigned = UNASSIGNED_OPEN.value ?? 0;
  if (unassigned > 0) parts.push(`${plural(unassigned, "demanda", "demandas")} sem responsável.`);
  return parts.join(" ");
}

export function buildPerformanceSummary(input: {
  range: DateRange;
  previousRange?: DateRange;
  /** Entregas concluídas em qualquer um dos dois períodos. */
  rows: DeliveryRow[];
  workedSeconds: { current: number; previous: number };
  snapshot: Snapshot;
}): PerformanceSummary {
  const ranges = resolveComparisonRanges(input.range, input.previousRange);
  const curRows = input.rows.filter((r) => inRange(r.completedAt, ranges.current));
  const prevRows = input.rows.filter((r) => inRange(r.completedAt, ranges.previous));
  const cur = windowOf(curRows);
  const prev = windowOf(prevRows);
  const hours = (s: number) => s / 3600;

  const indicators: Record<KpiKey, KpiResult> = {
    COMPLETED: result("COMPLETED", cur.completed, prev.completed),
    ON_TIME_RATE: result("ON_TIME_RATE", onTimeRate(cur.onTime, cur.withDueDate), onTimeRate(prev.onTime, prev.withDueDate)),
    OVERDUE: result("OVERDUE", input.snapshot.overdue, null),
    REWORK_RATE: result("REWORK_RATE", ratio(cur.rework, cur.completed), ratio(prev.rework, prev.completed)),
    ADJUSTMENTS: result("ADJUSTMENTS", input.snapshot.adjustments, null),
    WORKED_HOURS: result("WORKED_HOURS", hours(input.workedSeconds.current), hours(input.workedSeconds.previous)),
    AVG_LEAD_TIME_DAYS: result("AVG_LEAD_TIME_DAYS", mean(cur.leadDays), mean(prev.leadDays)),
    UNASSIGNED_OPEN: result("UNASSIGNED_OPEN", input.snapshot.unassignedOpen, null),
  };

  const byUser = new Map<string, { name: string; deliveries: number; onTime: number; withDue: number }>();
  const byType = new Map<string, { name: string; seconds: number[] }>();
  for (const row of curRows) {
    if (row.assignee) {
      const u = byUser.get(row.assignee.id) ?? { name: row.assignee.name, deliveries: 0, onTime: 0, withDue: 0 };
      u.deliveries += 1;
      if (row.dueDate) {
        u.withDue += 1;
        if (row.completedAt <= row.dueDate) u.onTime += 1;
      }
      byUser.set(row.assignee.id, u);
    }
    const typeKey = row.contentType?.id ?? "__none__";
    const t = byType.get(typeKey) ?? { name: row.contentType?.name ?? "Sem tipo", seconds: [] };
    t.seconds.push(row.activeSeconds);
    byType.set(typeKey, t);
  }

  const topDeliverers = Array.from(byUser, ([userId, u]) => ({
    userId,
    name: u.name,
    deliveries: u.deliveries,
    onTimeRate: onTimeRate(u.onTime, u.withDue),
  }))
    .sort((a, b) => b.deliveries - a.deliveries || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 3);

  let slowestType: PerformanceSummary["slowestType"] = null;
  for (const t of Array.from(byType.values())) {
    const avg = mean(t.seconds);
    if (avg === null || t.seconds.length < SMALL_SAMPLE_N) continue;
    if (!slowestType || avg > slowestType.avgSeconds) {
      slowestType = { name: t.name, avgSeconds: avg, n: t.seconds.length };
    }
  }

  const overdueBySector = [...input.snapshot.overdueBySector]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const partial = { indicators, overdueBySector };
  return {
    range: ranges.current,
    previousRange: ranges.previous,
    indicators,
    topDeliverers,
    slowestType,
    overdueBySector,
    series: buildSeries(curRows, prevRows, ranges),
    smallSample: cur.completed < SMALL_SAMPLE_N,
    headline: buildHeadline(partial),
  };
}
