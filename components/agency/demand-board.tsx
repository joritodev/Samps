"use client";

import { useState } from "react";
import { Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DemandCard,
  DemandDetailSheet,
} from "@/components/agency/demand-card";
import type {
  BoardColumn,
  BoardDemand,
  BoardTaxonomy,
} from "@/types/board-ui";

function BoardColumnView({
  column,
  onOpenCard,
}: {
  column: BoardColumn;
  onOpenCard: (demand: BoardDemand) => void;
}) {
  return (
    <section className="flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/80">
      <header className="flex shrink-0 items-center justify-between px-4 py-3.5">
        <h2 className="text-sm font-medium tracking-tight text-foreground">
          {column.title}
        </h2>
        <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {column.cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-4">
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <DemandCard key={card.id} demand={card} onOpen={onOpenCard} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            Nenhum cartão
          </div>
        )}
      </div>
    </section>
  );
}

export function DemandBoard({
  title,
  subtitle,
  columns,
  taxonomy,
}: {
  title: string;
  subtitle: string;
  columns: BoardColumn[];
  taxonomy: BoardTaxonomy;
}) {
  const [selected, setSelected] = useState<BoardDemand | null>(null);
  const [open, setOpen] = useState(false);

  function handleOpenCard(demand: BoardDemand) {
    setSelected(demand);
    setOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => toast.message("Filtros em breve.")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={() => toast.message("Criação de demanda em breve.")}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Demanda
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex h-full min-h-0 min-w-max gap-4 p-6">
          {columns.map((column) => (
            <BoardColumnView
              key={column.id}
              column={column}
              onOpenCard={handleOpenCard}
            />
          ))}
        </div>
      </main>

      <DemandDetailSheet
        demand={selected}
        taxonomy={taxonomy}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
