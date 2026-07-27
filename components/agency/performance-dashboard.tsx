"use client";

import { useState } from "react";
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

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
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

export function PerformanceDashboard({
  today,
  week,
  month,
}: {
  today: IndicatorSnapshot;
  week: IndicatorSnapshot;
  month: IndicatorSnapshot;
}) {
  const [selected, setSelected] = useState<PeriodKey>("week");

  const byPeriod: Record<PeriodKey, IndicatorSnapshot> = {
    today,
    week,
    month,
  };

  const activeLabel =
    PERIODS.find((p) => p.key === selected)?.label ?? "Semana";

  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Performance
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Indicadores de produtividade por período
        </p>
      </header>

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
    </div>
  );
}
