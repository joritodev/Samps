"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BoardHeader } from "@/components/board/board-header";
import { BoardFilters } from "@/components/board/board-filters";
import { BoardKanban } from "@/components/board/board-kanban";
import { BoardCalendar } from "@/components/board/board-calendar";
import { CardDetailSheet } from "@/components/board/card-detail-sheet";
import { Button } from "@/components/ui/button";
import { getCardDetailAction } from "@/lib/actions/cards.actions";
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

export function BoardView({
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
  lists,
  grouped,
  calendarDemands,
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
  lists: List[];
  grouped: Record<string, Demand[]>;
  calendarDemands: Demand[];
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
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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
      }
    });
  }

  return (
    <div>
      <BoardHeader
        clientId={clientId}
        boardId={boardId}
        clientName={clientName}
        logoUrl={logoUrl}
        brandColor={brandColor}
        contractStatus={contractStatus}
        socialName={socialName}
        managerName={managerName}
        competences={competences}
        currentCompetenceId={currentCompetenceId}
        view={view}
        onViewChange={setView}
        kpis={kpis}
      />

      <BoardFilters lists={lists} />

      {view === "kanban" ? (
        <BoardKanban
          clientId={clientId}
          columns={columns}
          itemsByColumn={grouped}
          onCardSelect={openCard}
        />
      ) : (
        <BoardCalendar demands={calendarDemands} onSelect={openCard} />
      )}

      <CardDetailSheet
        clientId={clientId}
        card={selectedCard}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelectedCard(null);
        }}
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
