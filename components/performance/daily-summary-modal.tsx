"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfidenceBar, ConfidenceChip } from "@/components/performance/confidence-chip";
import { GoalReading } from "@/components/performance/goal-row";
import { dismissDailySummaryAction } from "@/lib/actions/daily-summary.actions";
import { formatProgress } from "@/lib/agency/okr-format";
import { formatKpiValue } from "@/lib/agency/performance-format";
import type { DailySummaryContent } from "@/lib/services/daily-summary.service";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="num text-3xl font-semibold leading-none text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function attentionItems(c: DailySummaryContent) {
  const items: string[] = [];
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (c.dueToday > 0) items.push(count(c.dueToday, "demanda vence hoje", "demandas vencem hoje"));
  if (c.overdue > 0) items.push(count(c.overdue, "atrasada", "atrasadas"));
  if (c.adjustments > 0) items.push(count(c.adjustments, "voltou para ajuste", "voltaram para ajuste"));
  return items;
}

/**
 * Resumo do primeiro acesso do dia. Dispensável: "Entendi" (ou fechar) grava o
 * dia e o modal só volta amanhã. A pessoa revê tudo em Performance > Meu resumo.
 */
export function DailySummaryModal({ content }: { content: DailySummaryContent }) {
  const [open, setOpen] = useState(true);
  const [, startTransition] = useTransition();

  function dismiss() {
    setOpen(false);
    startTransition(async () => {
      await dismissDailySummaryAction();
    });
  }

  const attention = attentionItems(content);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <p className="text-xs font-medium text-muted-foreground">
            Seu resumo · {content.dayLabel}
          </p>
          <DialogTitle className="text-xl">{content.greeting}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{content.title}</span> {content.detail}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-1">
          <Stat value={String(content.completed)} label={content.completed === 1 ? "entrega concluída" : "entregas concluídas"} />
          <Stat value={formatKpiValue(content.onTimeRate, "percent")} label="no prazo" />
          <Stat value={formatKpiValue(content.workedHours, "hours")} label="trabalhadas" />
        </div>

        {attention.length > 0 ? (
          <div className="rounded-lg border border-border border-l-4 border-l-urgent bg-card px-3.5 py-2.5 text-sm">
            <p className="font-medium text-foreground">Hoje pede atenção</p>
            <p className="mt-0.5 text-muted-foreground">{attention.join(" · ")}</p>
          </div>
        ) : null}

        {content.goals.length > 0 ? (
          <section aria-label="Metas" className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Metas</h3>
            {content.goals.map((goal) => (
              <GoalReading key={goal.id} goal={goal} />
            ))}
          </section>
        ) : null}

        {content.objectives.length > 0 ? (
          <section aria-label="Seus objetivos" className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Seus objetivos</h3>
            {content.objectives.map((o) => (
              <div key={o.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{o.title}</p>
                  <p className="num text-sm text-foreground">{formatProgress(o.progress)}</p>
                </div>
                <div className="mt-1.5">
                  <ConfidenceBar confidence={o.confidence} progress={o.progress} />
                </div>
                <div className="mt-1">
                  <ConfidenceChip confidence={o.confidence} />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Você revê este resumo em Performance, Meu resumo.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" onClick={dismiss}>
              <Link href="/demandas">Ver minha fila</Link>
            </Button>
            <Button type="button" size="sm" onClick={dismiss}>
              Entendi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
