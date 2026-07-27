"use client";

import Link from "next/link";
import { CalendarDays, Kanban, Settings, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { switchCompetenceAction } from "@/lib/actions/competence.actions";
import { useTransition } from "react";

function formatCompetenceLabel(month: number, year: number) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[month - 1]} de ${year}`;
}

type Competence = { id: string; month: number; year: number; status: string };

export function BoardHeader({
  clientId,
  boardId,
  clientName,
  logoUrl,
  brandColor,
  contractStatus,
  socialName,
  managerName,
  competences,
  currentCompetenceId,
  view,
  onViewChange,
  kpis,
}: {
  clientId: string;
  boardId: string;
  clientName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  contractStatus?: string;
  socialName?: string;
  managerName?: string;
  competences: Competence[];
  currentCompetenceId: string;
  view: "kanban" | "calendar";
  onViewChange: (v: "kanban" | "calendar") => void;
  kpis: {
    feedsContracted: number;
    feedsDemanded: number;
    feedsPublished: number;
    storiesContracted: number;
    overdue: number;
    unassigned: number;
  };
}) {
  const [pending, startTransition] = useTransition();
  const current = competences.find((c) => c.id === currentCompetenceId);
  const currentIndex = competences.findIndex((c) => c.id === currentCompetenceId);

  const feedsPct =
    kpis.feedsContracted > 0
      ? Math.min(100, Math.round((kpis.feedsDemanded / kpis.feedsContracted) * 100))
      : 0;

  function handleCompetenceChange(competenceId: string) {
    startTransition(async () => {
      await switchCompetenceAction(boardId, clientId, competenceId);
    });
  }

  function shiftCompetence(delta: number) {
    const next = competences[currentIndex + delta];
    if (next) handleCompetenceChange(next.id);
  }

  return (
    <div className="mb-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href="/clientes" className="hover:text-primary">
              Clientes
            </Link>
            <span>/</span>
            <span>{clientName}</span>
            {contractStatus && <Badge variant="outline">{contractStatus}</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/30 shadow-soft"
              style={{ backgroundColor: brandColor ?? "hsl(var(--teal-light))" }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <span className="font-display text-sm font-bold text-white">
                  {clientName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">
                {clientName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {[socialName && `Social: ${socialName}`, managerName && `Gestor: ${managerName}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-soft">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pending || currentIndex <= 0}
              onClick={() => shiftCompetence(-1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <select
              className="h-8 w-32 border-0 bg-transparent text-center text-sm font-medium outline-none"
              value={currentCompetenceId}
              disabled={pending}
              onChange={(e) => handleCompetenceChange(e.target.value)}
            >
              {competences.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatCompetenceLabel(c.month, c.year)}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pending || currentIndex >= competences.length - 1}
              onClick={() => shiftCompetence(1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/clientes/${clientId}/quadro/configuracoes`}>
              <Settings className="mr-1 h-4 w-4" />
              Configurações
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clientes/${clientId}/visualizar`}>
              <Eye className="mr-1 h-4 w-4" />
              Ver como cliente
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Feeds</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-2xl font-semibold">
              {kpis.feedsDemanded}/{kpis.feedsContracted}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">demandados</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${feedsPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {kpis.feedsPublished} publicados
          </p>
        </div>
        <StatCard
          title="Stories contratados"
          value={kpis.storiesContracted}
          accent="teal"
        />
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Atrasadas" value={kpis.overdue} accent="destructive" />
          <StatCard title="Sem responsável" value={kpis.unassigned} accent="muted" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border/50 px-2">
          <div className="flex">
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Kanban className="h-4 w-4" />
                Quadro
              </span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("calendar")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                view === "calendar"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Calendário
              </span>
            </button>
          </div>
          {current && (
            <p className="hidden pr-4 text-xs text-muted-foreground sm:block">
              Competência:{" "}
              <strong className="text-foreground">
                {formatCompetenceLabel(current.month, current.year)}
              </strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
