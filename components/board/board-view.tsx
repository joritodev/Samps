"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BoardHeader, BoardInsights } from "@/components/board/board-header";
import { BoardFilters } from "@/components/board/board-filters";
import { BoardKanban } from "@/components/board/board-kanban";
import { BoardCalendar } from "@/components/board/board-calendar";
import { CardDetailSheet } from "@/components/board/card-detail-sheet";
import { Button } from "@/components/ui/button";
import { getCardDetailAction } from "@/lib/actions/cards.actions";
import type { DemandDelayRow } from "@/components/shared/demand-delay-history";
import { toast } from "sonner";

type List = { id: string; name: string; type: string };
type Competence = { id: string; month: number; year: number; status: string };
type Demand = {
  id: string;
  title: string;
  type: string;
  format?: string | null;
  status: string;
  listId?: string | null;
  boardColumn?: string;
  dueDate?: Date | null;
  deliveryDate?: Date | null;
  publishDate?: Date | null;
  client?: { name: string; brandColor?: string | null };
  assignee?: { name: string } | null;
  priority?: { name: string; color: string } | null;
  origin?: string;
};

type CardDetail = NonNullable<Parameters<typeof CardDetailSheet>[0]["card"]>;

function useActiveFilterCount() {
  const params = useSearchParams();
  return useMemo(() => {
    let n = 0;
    if (params.get("busca")) n += 1;
    if (params.get("lista")) n += 1;
    if (params.get("status")) n += 1;
    if (params.get("visivel")) n += 1;
    return n;
  }, [params]);
}

function BoardToolbar({
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
  lists,
  kpis,
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
  lists: List[];
  kpis: {
    feedsContracted: number;
    feedsDemanded: number;
    feedsPublished: number;
    storiesContracted: number;
    overdue: number;
    unassigned: number;
  };
}) {
  const activeFilterCount = useActiveFilterCount();

  return (
    <>
      <BoardHeader
        clientId={clientId}
        boardId={boardId}
        clientName={clientName}
        logoUrl={logoUrl}
        brandColor={brandColor}
        contractStatus={contractStatus}
        competences={competences}
        currentCompetenceId={currentCompetenceId}
        view={view}
        onViewChange={onViewChange}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={onFiltersOpenChange}
        insightsOpen={insightsOpen}
        onInsightsOpenChange={onInsightsOpenChange}
        activeFilterCount={activeFilterCount}
      />

      {insightsOpen ? <BoardInsights kpis={kpis} /> : null}

      {filtersOpen ? (
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
          <BoardFilters lists={lists} />
        </div>
      ) : null}
    </>
  );
}

export function BoardView({
  clientId,
  boardId,
  clientName,
  logoUrl,
  brandColor,
  contractStatus,
  competences,
  currentCompetenceId,
  lists,
  grouped,
  calendarDemands,
  kpis,
  canManageLists = false,
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
  lists: List[];
  grouped: Record<string, Demand[]>;
  calendarDemands: Demand[];
  canManageLists?: boolean;
  kpis: {
    feedsContracted: number;
    feedsDemanded: number;
    feedsPublished: number;
    storiesContracted: number;
    overdue: number;
    unassigned: number;
  };
}) {
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [canChangeDeadline, setCanChangeDeadline] = useState(false);
  const [cardDelays, setCardDelays] = useState<DemandDelayRow[]>([]);
  const [, startTransition] = useTransition();

  const columns = lists.map((l) => ({ id: l.id, title: l.name }));

  function openCard(id: string) {
    setSheetOpen(true);
    startTransition(async () => {
      const result = await getCardDetailAction(id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        setSheetOpen(false);
        return;
      }
      if ("card" in result && result.card) {
        setSelectedCard(result.card as CardDetail);
        setCanChangeDeadline(result.canChangeDeadline ?? false);
        setCardDelays(result.delays ?? []);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <Suspense
        fallback={
          <div className="shrink-0 border-b border-border px-6 py-4 text-sm text-muted-foreground">
            Carregando…
          </div>
        }
      >
        <BoardToolbar
          clientId={clientId}
          boardId={boardId}
          clientName={clientName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          contractStatus={contractStatus}
          competences={competences}
          currentCompetenceId={currentCompetenceId}
          view={view}
          onViewChange={setView}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          insightsOpen={insightsOpen}
          onInsightsOpenChange={setInsightsOpen}
          lists={lists}
          kpis={kpis}
        />
      </Suspense>

      <main className="min-h-0 flex-1 overflow-hidden bg-background">
        {view === "kanban" ? (
          <BoardKanban
            clientId={clientId}
            boardId={boardId}
            columns={columns}
            itemsByColumn={grouped}
            onCardSelect={openCard}
            canManageLists={canManageLists}
          />
        ) : (
          <div className="h-full min-h-0 overflow-hidden bg-background p-4">
            <BoardCalendar
              demands={calendarDemands}
              onSelect={openCard}
              clientName={clientName}
            />
          </div>
        )}
      </main>

      <CardDetailSheet
        clientId={clientId}
        card={selectedCard}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelectedCard(null);
        }}
        canChangeDeadline={canChangeDeadline}
        delays={cardDelays}
      />
    </div>
  );
}

export function NoBoardView({ clientId }: { clientId: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center shadow-soft">
      <p className="mb-4 text-muted-foreground">
        Este cliente ainda não possui quadro interno.
      </p>
      <Button asChild>
        <Link href={`/clientes/quadro/criar?clientId=${clientId}`}>
          Criar quadro e portal
        </Link>
      </Button>
    </div>
  );
}
