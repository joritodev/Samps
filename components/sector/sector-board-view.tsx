"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Kanban,
  List,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { DemandCard } from "@/components/shared/demand-card";
import { BoardColumnEmpty } from "@/components/board/board-column-empty";
import { BoardCalendar } from "@/components/board/board-calendar";
import {
  SectorCardSheet,
  type SectorCardDetail,
} from "@/components/sector/sector-card-sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DemandItem = Parameters<typeof DemandCard>[0]["demand"] & {
  id: string;
  clientId?: string;
  description?: string | null;
  materialUrl?: string | null;
  scheduledExecutionAt?: Date | null;
  demandDeadline?: Date | null;
  assignments?: SectorCardDetail["assignments"];
  workSessions?: SectorCardDetail["workSessions"];
};

export function SectorBoardView({
  title,
  description,
  columns,
  grouped,
  top5,
  kpis,
  calendarDemands,
  currentUserId,
  canAssign,
  canReview = false,
  canChangeDeadline = false,
  sectorUsers,
  shoots,
}: {
  title: string;
  description: string;
  columns: { id: string; title: string }[];
  grouped: Record<string, DemandItem[]>;
  top5: DemandItem[];
  kpis: {
    priorityCount: number;
    available: number;
    inProduction: number;
    doneToday: number;
    doneWeek: number;
    doneMonth: number;
    overdue: number;
    unassigned: number;
    inReview: number;
    adjustments: number;
  };
  calendarDemands: DemandItem[];
  currentUserId: string;
  canAssign: boolean;
  canReview?: boolean;
  canChangeDeadline?: boolean;
  sectorUsers: { id: string; name: string }[];
  shoots?: {
    id: string;
    title: string;
    date: Date;
    client?: { name: string } | null;
  }[];
}) {
  const [view, setView] = useState<"kanban" | "calendar" | "list">("kanban");
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [top5Open, setTop5Open] = useState(false);
  const [selected, setSelected] = useState<DemandItem | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              <Kanban className="mr-1 h-4 w-4" />
              Quadro
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="mr-1 h-4 w-4" />
              Calendário
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="mr-1 h-4 w-4" />
              Lista
            </Button>
          </div>
          <Button
            variant={insightsOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setInsightsOpen((v) => !v)}
          >
            <BarChart3 className="mr-1 h-3.5 w-3.5" />
            Indicadores
          </Button>
          {top5.length > 0 && (
            <Button
              variant={top5Open ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTop5Open((v) => !v)}
            >
              <ListOrdered className="mr-1 h-3.5 w-3.5" />
              Top 5
            </Button>
          )}
        </div>
      </header>

      {insightsOpen ? (
        <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
          <MetricCard label="Prioritárias" value={kpis.priorityCount} tone="primary" />
          <MetricCard label="Disponíveis" value={kpis.available} tone="teal" />
          <MetricCard label="Em produção" value={kpis.inProduction} />
          <MetricCard label="Concluídas hoje" value={kpis.doneToday} tone="primary" />
          <MetricCard label="Atrasadas" value={kpis.overdue} tone="danger" />
          <MetricCard label="Sem responsável" value={kpis.unassigned} />
          <MetricCard label="Em revisão" value={kpis.inReview} tone="teal" />
          <MetricCard label="Ajustes" value={kpis.adjustments} tone="danger" />
          <MetricCard label="Concluídas na semana" value={kpis.doneWeek} />
          <MetricCard label="Concluídas no mês" value={kpis.doneMonth} />
        </div>
      ) : null}

      {top5Open && top5.length > 0 ? (
        <div className="mt-3 shrink-0 rounded-xl border border-border/60 bg-card p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Top 5 prioridades do dia</h2>
            <Badge variant="secondary">Automático</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {top5.map((d) => (
              <DemandCard
                key={`top-${d.id}`}
                demand={d}
                showOrigin
                onClick={() => setSelected(d)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "mt-3 min-h-0 flex-1",
          view === "kanban" ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {view === "kanban" ? (
          <div className="flex h-full gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
            {columns.map((col) => {
              const cards = grouped[col.id] ?? [];
              return (
                <div
                  key={col.id}
                  className="flex h-full w-72 shrink-0 snap-start flex-col rounded-xl border border-border/60 bg-card p-3 shadow-soft"
                >
                  <div className="mb-2 flex shrink-0 items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {col.title}
                    </h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {cards.length}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {cards.length > 0 ? (
                      cards.map((demand) => (
                        <DemandCard
                          key={demand.id}
                          demand={demand}
                          showOrigin
                          onClick={() => setSelected(demand)}
                        />
                      ))
                    ) : (
                      <BoardColumnEmpty />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === "calendar" ? (
          <BoardCalendar
            demands={calendarDemands}
            onSelect={(id) => {
              const d = calendarDemands.find((x) => x.id === id);
              if (d) setSelected(d);
            }}
          />
        ) : (
          <div className="space-y-4 pb-1">
            {columns.map((col) => {
              const demands = grouped[col.id] ?? [];
              if (demands.length === 0) return null;

              return (
                <section
                  key={col.id}
                  className="rounded-xl border border-border/60 bg-card p-3 shadow-soft"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {col.title}
                    </h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {demands.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {demands.map((demand) => (
                      <DemandCard
                        key={demand.id}
                        demand={demand}
                        showOrigin
                        onClick={() => setSelected(demand)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {shoots && shoots.length > 0 ? (
        <div className="mt-3 shrink-0">
          <h2 className="mb-2 text-sm font-semibold">Captações</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shoots.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-card p-3 text-sm shadow-soft"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.client?.name} ·{" "}
                  {new Date(s.date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <SectorCardSheet
        card={
          selected
            ? {
                id: selected.id,
                title: selected.title,
                description: selected.description,
                format: selected.format,
                status: selected.status,
                clientId: selected.clientId ?? "",
                materialUrl: selected.materialUrl,
                scheduledExecutionAt: selected.scheduledExecutionAt,
                demandDeadline: selected.demandDeadline,
                dueDate: selected.dueDate,
                publishDate: (selected as { publishDate?: Date | null }).publishDate,
                client: selected.client,
                assignee: selected.assignee
                  ? {
                      id: (selected.assignee as { id?: string }).id ?? "",
                      name: selected.assignee.name,
                    }
                  : null,
                assignments: selected.assignments,
                workSessions: selected.workSessions,
              }
            : null
        }
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        currentUserId={currentUserId}
        canAssign={canAssign}
        canReview={canReview}
        canChangeDeadline={canChangeDeadline}
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
