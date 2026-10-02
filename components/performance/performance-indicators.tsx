"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PerformanceFilters, type PerformanceFiltersProps } from "@/components/performance/performance-filters";
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
import { formatDuration } from "@/lib/agency/performance-format";
import type {
  ContentTypeStats,
  PerformanceReport,
  UserRow,
} from "@/lib/services/performance.service";

function percentage(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

type ReportTab = "pessoas" | "tipos";

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

function PeopleTable({ rows }: { rows: UserRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
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
                            {formatDuration(type.avgSeconds)} · n={type.n}
                          </span>
                          {type.n < SMALL_SAMPLE_N ? (
                            <span className="text-warning">
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
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
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
                  {formatDuration(row.avgSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDuration(row.medianSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDuration(row.stdDevSeconds)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function PerformanceIndicators({
  report,
  filters,
}: {
  report: PerformanceReport;
  filters: PerformanceFiltersProps;
}) {
  const [activeTab, setActiveTab] = useState<ReportTab>("pessoas");

  function exportCsv() {
    const rows: (string | number)[][] =
      activeTab === "pessoas"
        ? [
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
          ]
        : [
            ["Tipo", "n", "Média (s)", "Mediana (s)", "Desvio (s)"],
            ...report.byContentType.map((row) => [
              row.name,
              row.n,
              row.avgSeconds ?? "",
              row.medianSeconds ?? "",
              row.stdDevSeconds ?? "",
            ]),
          ];

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
    <div className="space-y-5">
      <PerformanceFilters {...filters} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReportTab)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="pessoas">Por pessoa</TabsTrigger>
            <TabsTrigger value="tipos">Por tipo</TabsTrigger>
          </TabsList>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download />
            Exportar CSV
          </Button>
        </div>

        <TabsContent value="pessoas" className="mt-4">
          <PeopleTable rows={report.byUser} />
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <ContentTypeTable rows={report.byContentType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
