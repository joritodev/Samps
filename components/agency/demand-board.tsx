"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Filter, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BoardColumnEmpty } from "@/components/board/board-column-empty";
import {
  DemandCard,
  DemandDetailSheet,
} from "@/components/agency/demand-card";
import { NewDemandSheet } from "@/components/agency/new-demand-sheet";
import type {
  BoardColumn,
  BoardDemand,
  BoardTaxonomy,
  TaxonomyOption,
} from "@/types/board-ui";

function BoardColumnView({
  column,
  onOpenCard,
  filtered,
}: {
  column: BoardColumn;
  onOpenCard: (demand: BoardDemand) => void;
  filtered?: boolean;
}) {
  return (
    <section className="flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-foreground/[0.025] dark:bg-foreground/[0.03]">
      <header className="flex shrink-0 items-center gap-2 px-3.5 py-3">
        <h2 className="min-w-0 flex-1 truncate font-sans text-sm font-semibold tracking-normal text-foreground">
          {column.title}
        </h2>
        <span className="num rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {column.cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <DemandCard key={card.id} demand={card} onOpen={onOpenCard} />
          ))
        ) : (
          <BoardColumnEmpty
            description={
              filtered
                ? "Nenhuma demanda deste filtro nesta etapa."
                : "Crie uma demanda ou aguarde novas atribuições."
            }
          />
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
  clients = [],
  canCreate = false,
  filterLabel,
  openDemandId,
}: {
  title: string;
  subtitle: string;
  columns: BoardColumn[];
  taxonomy: BoardTaxonomy;
  clients?: TaxonomyOption[];
  canCreate?: boolean;
  /** Rótulo do recorte vindo de `?filtro=` (links do painel). */
  filterLabel?: string;
  /** Abre o detalhe desta demanda ao carregar (`?abrir=`). */
  openDemandId?: string;
}) {
  const [selected, setSelected] = useState<BoardDemand | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!openDemandId) return;
    const target = columns
      .flatMap((c) => c.cards)
      .find((card) => card.id === openDemandId);
    if (target) {
      setSelected(target);
      setOpen(true);
    }
  }, [openDemandId, columns]);
  const [createOpen, setCreateOpen] = useState(false);

  function handleOpenCard(demand: BoardDemand) {
    setSelected(demand);
    setOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 px-1 pb-4 pt-1 sm:px-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          {filterLabel ? (
            <Link
              href="/demandas"
              className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pl-3 pr-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remover filtro ${filterLabel}`}
            >
              Filtro: {filterLabel}
              <X className="size-3.5 text-muted-foreground" aria-hidden />
            </Link>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => toast.message("Filtros em breve.")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>
          {canCreate ? (
            <Button
              size="sm"
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={clients.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Demanda
            </Button>
          ) : null}
        </div>
      </header>

      <main className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-h-0 min-w-max gap-3 px-1 pb-1 sm:px-2">
          {columns.map((column) => (
            <div key={column.id} className="snap-start">
              <BoardColumnView
                column={column}
                onOpenCard={handleOpenCard}
                filtered={Boolean(filterLabel)}
              />
            </div>
          ))}
        </div>
      </main>

      <DemandDetailSheet
        demand={selected}
        taxonomy={taxonomy}
        open={open}
        onOpenChange={setOpen}
      />
      {canCreate ? (
        <NewDemandSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          clients={clients}
          sectors={taxonomy.sectors}
          priorities={taxonomy.priorities}
        />
      ) : null}
    </div>
  );
}
