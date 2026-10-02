"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKpiValue } from "@/lib/agency/performance-format";
import type { PerformanceSummary } from "@/lib/agency/performance-summary";
import { dayKey } from "@/lib/agency/sp-calendar";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Baixar PDF = impressão do navegador (com estilo próprio); CSV monta no cliente. */
export function MySummaryActions({ summary }: { summary: PerformanceSummary }) {
  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Indicador", "Valor", "Período anterior"],
      ...Object.values(summary.indicators).map((k) => [
        k.label,
        formatKpiValue(k.value, k.unit),
        k.snapshot ? "" : formatKpiValue(k.previous, k.unit),
      ]),
      [],
      ["Dia", "Entregas", "Entregas no período anterior"],
      ...summary.series.map((p) => [p.date, p.current, p.previous]),
    ];
    const text = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meu-resumo-${dayKey(summary.range.from)}-${dayKey(summary.range.to)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer />
        Baixar PDF
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
        <Download />
        Exportar CSV
      </Button>
    </div>
  );
}
