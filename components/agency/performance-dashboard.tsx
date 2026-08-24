"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PerformanceFilters, type PerformanceFiltersProps } from "@/components/agency/performance-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SMALL_SAMPLE_N } from "@/lib/agency/performance-math";
import type {
  ContentTypeStats,
  PerformanceReport,
  UserRow,
} from "@/lib/services/performance.service";
import { cn } from "@/lib/utils";

export type IndicatorSnapshot = {
  period: string;
  completed: number;
  overdue: number;
  inProgress: number;
  adjustments: number;
  sessionsCount: number;
  totalWorkedSeconds: number;
  avgSessionSeconds: number;
};

type PeriodKey = "today" | "week" | "month";
type ReportTab = "resumo" | "pessoas" | "tipos";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function duration(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

function percentage(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvFromRows(rows: (string | number)[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function SmallSampleBadge() {
  return <Badge variant="warning">Amostra pequena</Badge>;
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "teal" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        tone === "default" && "border-border",
        tone === "danger" &&
          "border-destructive/40 dark:border-destructive/35 dark:bg-destructive/10",
        tone === "teal" &&
          "border-emerald-500/35 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/10",
        tone === "primary" &&
          "border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground",
          tone === "danger" && "text-destructive",
          tone === "primary" && "text-primary",
          tone === "teal" && "text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function PeriodStripCard({
  label,
  data,
  selected,
  onSelect,
}: {
  label: string;
  data: IndicatorSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/40 dark:bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Concluídas" value={data.completed} />
        <MiniStat label="Em produção" value={data.inProgress} />
        <MiniStat label="Atrasadas" value={data.overdue} />
        <MiniStat label="Ajustes" value={data.adjustments} />
      </div>
    </button>
  );
}

function PeriodDetail({
  title,
  data,
}: {
  title: string;
  data: IndicatorSnapshot;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        Detalhe — {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Concluídas" value={data.completed} tone="primary" />
        <Metric label="Em produção" value={data.inProgress} tone="teal" />
        <Metric label="Atrasadas" value={data.overdue} tone="danger" />
        <Metric label="Ajustes" value={data.adjustments} tone="danger" />
        <Metric label="Sessões" value={data.sessionsCount} />
        <Metric
          label="Tempo trabalhado"
          value={hours(data.totalWorkedSeconds)}
        />
        <Metric
          label="Tempo médio/sessão"
          value={hours(data.avgSessionSeconds)}
        />
      </div>
    </section>
  );
}

function PeopleTable({ rows }: { rows: UserRow[] }) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pessoa</TableHead>
            <TableHead className="text-right">Entregas</TableHead>
            <TableHead className="text-right">No prazo</TableHead>
            <TableHead className="text-right">Retrabalho</TableHead>
            <TableHead>Tempo médio por tipo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                Nenhuma entrega encontrada no período. Só entram demandas com
                produção concluída (não “em produção” nem atraso do Resumo).
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.deliveries < SMALL_SAMPLE_N ? (
                      <SmallSampleBadge />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.deliveries}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {percentage(row.onTimeRate)}
                  {row.withDueDate > 0 ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({row.onTime}/{row.withDueDate})
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.reworkSessions}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {row.avgSecondsByType.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      row.avgSecondsByType.map((type) => (
                        <div
                          key={type.contentTypeId ?? "without-type"}
                          className="flex flex-wrap items-center gap-x-2 text-xs"
                        >
                          <span>{type.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {duration(type.avgSeconds)} · n={type.n}
                          </span>
                          {type.n < SMALL_SAMPLE_N ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              Amostra pequena
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ContentTypeTable({ rows }: { rows: ContentTypeStats[] }) {
  const maxN = Math.max(1, ...rows.map((row) => row.n));

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead className="w-48">Volume</TableHead>
            <TableHead className="text-right">Média</TableHead>
            <TableHead className="text-right">Mediana</TableHead>
            <TableHead className="text-right">Desvio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                Nenhuma entrega encontrada no período. Só entram demandas com
                produção concluída (não “em produção” nem atraso do Resumo).
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.contentTypeId ?? "without-type"}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.n < SMALL_SAMPLE_N ? <SmallSampleBadge /> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-7 text-right tabular-nums">{row.n}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.n / maxN) * 100}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {duration(row.avgSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {duration(row.medianSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {duration(row.stdDevSeconds)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function PerformanceDashboard({
  today,
  week,
  month,
  report,
  filters,
}: {
  today: IndicatorSnapshot;
  week: IndicatorSnapshot;
  month: IndicatorSnapshot;
  report: PerformanceReport;
  filters: PerformanceFiltersProps;
}) {
  const [selected, setSelected] = useState<PeriodKey>("week");
  const [activeTab, setActiveTab] = useState<ReportTab>("resumo");

  const byPeriod: Record<PeriodKey, IndicatorSnapshot> = {
    today,
    week,
    month,
  };

  const activeLabel =
    PERIODS.find((p) => p.key === selected)?.label ?? "Semana";

  function exportCsv() {
    let rows: (string | number)[][];

    if (activeTab === "resumo") {
      const deliveries = report.byContentType.reduce((acc, row) => acc + row.n, 0);
      rows = [
        [
          "De",
          "Até",
          "Entregas (filtro)",
          "Pessoas",
          "Tipos",
          "Snapshot hoje concluídas",
          "Snapshot semana concluídas",
          "Snapshot mês concluídas",
        ],
        [
          report.from,
          report.to,
          deliveries,
          report.byUser.length,
          report.byContentType.length,
          today.completed,
          week.completed,
          month.completed,
        ],
      ];
    } else if (activeTab === "pessoas") {
      rows = [
        [
          "Pessoa",
          "Entregas",
          "No prazo",
          "Com prazo",
          "No prazo %",
          "Retrabalho (sessões)",
          "Tempo médio por tipo",
        ],
        ...report.byUser.map((row) => [
          row.name,
          row.deliveries,
          row.onTime,
          row.withDueDate,
          row.onTimeRate === null ? "" : (row.onTimeRate * 100).toFixed(1),
          row.reworkSessions,
          row.avgSecondsByType
            .map(
              (type) =>
                `${type.name}: ${type.avgSeconds ?? ""}s (n=${type.n})`,
            )
            .join("; "),
        ]),
      ];
    } else {
      rows = [
        ["Tipo", "n", "Média (s)", "Mediana (s)", "Desvio (s)"],
        ...report.byContentType.map((row) => [
          row.name,
          row.n,
          row.avgSeconds ?? "",
          row.medianSeconds ?? "",
          row.stdDevSeconds ?? "",
        ]),
      ];
    }

    const blob = new Blob([`\uFEFF${csvFromRows(rows)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performance-${activeTab}-${report.from}-${report.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Performance
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Indicadores de produtividade por período
          </p>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv}>
          <Download />
          Exportar CSV
        </Button>
      </header>

      <PerformanceFilters {...filters} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReportTab)}
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="pessoas">Por pessoa</TabsTrigger>
          <TabsTrigger value="tipos">Por tipo</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-5 space-y-6">
          <div className="grid gap-3 lg:grid-cols-3">
            {PERIODS.map(({ key, label }) => (
              <PeriodStripCard
                key={key}
                label={label}
                data={byPeriod[key]}
                selected={selected === key}
                onSelect={() => setSelected(key)}
              />
            ))}
          </div>
          <PeriodDetail title={activeLabel} data={byPeriod[selected]} />
        </TabsContent>

        <TabsContent value="pessoas" className="mt-5">
          <PeopleTable rows={report.byUser} />
        </TabsContent>

        <TabsContent value="tipos" className="mt-5">
          <ContentTypeTable rows={report.byContentType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
