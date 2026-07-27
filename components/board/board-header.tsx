"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Kanban,
  MoreHorizontal,
  Settings,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchCompetenceAction } from "@/lib/actions/competence.actions";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

function formatCompetenceLabel(month: number, year: number) {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[month - 1]} de ${year}`;
}

type Competence = { id: string; month: number; year: number; status: string };

export type BoardKpis = {
  feedsContracted: number;
  feedsDemanded: number;
  feedsPublished: number;
  storiesContracted: number;
  overdue: number;
  unassigned: number;
};

/** Faixa única: identidade + competência + visão + ações secundárias. */
export function BoardHeader({
  clientId,
  boardId,
  clientName,
  logoUrl,
  brandColor,
  contractStatus,
  competences,
  currentCompetenceId,
  view,
  onViewChange,
  filtersOpen,
  onFiltersOpenChange,
  insightsOpen,
  onInsightsOpenChange,
  activeFilterCount,
}: {
  clientId: string;
  boardId: string;
  clientName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  contractStatus?: string;
  competences: Competence[];
  currentCompetenceId: string;
  view: "kanban" | "calendar";
  onViewChange: (v: "kanban" | "calendar") => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  insightsOpen: boolean;
  onInsightsOpenChange: (open: boolean) => void;
  activeFilterCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const currentIndex = competences.findIndex(
    (c) => c.id === currentCompetenceId
  );

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
    <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/clientes/${clientId}`}
            className="flex shrink-0 items-center rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              style={{
                backgroundColor: brandColor ?? "hsl(var(--primary))",
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold text-white">
                  {clientName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/clientes/${clientId}`}
                className="truncate text-base font-semibold tracking-tight text-foreground outline-none hover:opacity-90 focus-visible:underline"
              >
                {clientName}
              </Link>
              {contractStatus ? (
                <Badge variant="outline" className="hidden font-normal sm:inline-flex">
                  {contractStatus}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link href="/clientes" className="hover:text-foreground">
                Clientes
              </Link>
              <span className="mx-1">/</span>
              Quadro
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pending || currentIndex <= 0}
              onClick={() => shiftCompetence(-1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <select
              className="h-7 min-w-32 border-0 bg-transparent text-center text-xs font-medium outline-none"
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
              className="h-7 w-7"
              disabled={pending || currentIndex >= competences.length - 1}
              onClick={() => shiftCompetence(1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Quadro
            </button>
            <button
              type="button"
              onClick={() => onViewChange("calendar")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendário
            </button>
          </div>

          <Button
            variant={filtersOpen ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          <Button
            variant={insightsOpen ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => onInsightsOpenChange(!insightsOpen)}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Indicadores
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Mais ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={`/clientes/${clientId}`}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Ficha do cliente
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/portal/${clientId}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver como cliente
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/clientes/${clientId}/quadro/configuracoes`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações do quadro
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function BoardInsights({ kpis }: { kpis: BoardKpis }) {
  const feedsPct =
    kpis.feedsContracted > 0
      ? Math.min(
          100,
          Math.round((kpis.feedsDemanded / kpis.feedsContracted) * 100)
        )
      : 0;

  const items = [
    {
      label: "Feeds demandados",
      value: `${kpis.feedsDemanded}/${kpis.feedsContracted || "—"}`,
      hint: `${kpis.feedsPublished} publicados · ${feedsPct}%`,
    },
    {
      label: "Stories contratados",
      value: String(kpis.storiesContracted),
    },
    {
      label: "Atrasadas",
      value: String(kpis.overdue),
      danger: kpis.overdue > 0,
    },
    {
      label: "Sem responsável",
      value: String(kpis.unassigned),
      muted: kpis.unassigned > 0,
    },
  ];

  return (
    <div className="grid gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-lg border border-border bg-card px-3 py-2.5",
            item.danger && "border-l-2 border-l-destructive",
            item.muted && "border-l-2 border-l-muted-foreground"
          )}
        >
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {item.value}
          </p>
          {item.hint ? (
            <p className="text-[11px] text-muted-foreground">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
