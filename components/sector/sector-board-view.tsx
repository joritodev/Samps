"use client";

import { useState } from "react";
import { CalendarDays, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { DemandCard } from "@/components/shared/demand-card";
import { BoardCalendar } from "@/components/board/board-calendar";
import { SectorCardSheet, type SectorCardDetail } from "@/components/sector/sector-card-sheet";
import { Badge } from "@/components/ui/badge";

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
  sectorUsers: { id: string; name: string }[];
  shoots?: { id: string; title: string; date: Date; client?: { name: string } | null }[];
}) {
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [selected, setSelected] = useState<DemandItem | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex rounded-lg border border-border bg-card p-0.5 shadow-soft">
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
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Prioritárias" value={kpis.priorityCount} accent="primary" />
        <StatCard title="Disponíveis" value={kpis.available} accent="teal" />
        <StatCard title="Em produção" value={kpis.inProduction} accent="muted" />
        <StatCard title="Concluídas hoje" value={kpis.doneToday} accent="primary" />
        <StatCard title="Atrasadas" value={kpis.overdue} accent="destructive" />
        <StatCard title="Sem responsável" value={kpis.unassigned} accent="muted" />
        <StatCard title="Em revisão" value={kpis.inReview} accent="teal" />
        <StatCard title="Ajustes" value={kpis.adjustments} accent="destructive" />
        <StatCard title="Concluídas na semana" value={kpis.doneWeek} />
        <StatCard title="Concluídas no mês" value={kpis.doneMonth} />
      </div>

      {top5.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-base font-semibold">
              Top 5 prioridades do dia
            </h2>
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
      )}

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-soft"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {(grouped[col.id] ?? []).length}
                </span>
              </div>
              <div className="space-y-2">
                {(grouped[col.id] ?? []).map((demand) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    showOrigin
                    onClick={() => setSelected(demand)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BoardCalendar
          demands={calendarDemands}
          onSelect={(id) => {
            const d = calendarDemands.find((x) => x.id === id);
            if (d) setSelected(d);
          }}
        />
      )}

      {shoots && shoots.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-semibold">Captações</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shoots.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-card p-3 text-sm shadow-soft"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.client?.name} · {new Date(s.date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
