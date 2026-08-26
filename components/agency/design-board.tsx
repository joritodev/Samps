"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BoardColumnEmpty } from "@/components/board/board-column-empty";
import { DemandCard } from "@/components/agency/demand-card";
import { assumirDemanda, concluirProducao } from "@/app/actions/designer";
import { aprovarDemanda, solicitarAjuste } from "@/app/actions/review";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

type SheetMode = "claim" | "deliver" | "review" | null;

function shortCode(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

function DesignColumn({
  column,
  onOpenCard,
}: {
  column: BoardColumn;
  onOpenCard: (demand: BoardDemand, mode: SheetMode) => void;
}) {
  function handleOpen(demand: BoardDemand) {
    if (column.id === "available") {
      onOpenCard(demand, "claim");
      return;
    }
    if (column.id === "production" || column.id === "adjustments") {
      onOpenCard(demand, "deliver");
      return;
    }
    if (column.id === "review") {
      onOpenCard(demand, "review");
      return;
    }
    toast.message("Esta etapa não tem ação neste MVP.");
  }

  return (
    <section className="flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/80">
      <header className="flex shrink-0 items-center justify-between px-4 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
        <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {column.cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <DemandCard key={card.id} demand={card} onOpen={handleOpen} />
          ))
        ) : (
          <BoardColumnEmpty description="Aguarde novas demandas nesta etapa." />
        )}
      </div>
    </section>
  );
}

function DesignDemandSheet({
  demand,
  mode,
  open,
  onOpenChange,
}: {
  demand: BoardDemand | null;
  mode: SheetMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [materialUrl, setMaterialUrl] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!demand) return;
    setMaterialUrl(demand.materialUrl ?? "");
    setAdjustmentReason("");
  }, [demand]);

  function handleAssumir() {
    if (!demand) return;
    startTransition(async () => {
      const result = await assumirDemanda(demand.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda assumida. Status: em produção.");
      onOpenChange(false);
    });
  }

  function handleConcluir() {
    if (!demand) return;
    const url = materialUrl.trim();
    if (!url) {
      toast.error("O link do material é obrigatório");
      return;
    }
    startTransition(async () => {
      const result = await concluirProducao(demand.id, url);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Produção concluída. Enviado para revisão.");
      onOpenChange(false);
    });
  }

  function handleAprovar() {
    if (!demand) return;
    startTransition(async () => {
      const result = await aprovarDemanda(demand.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Material aprovado.");
      onOpenChange(false);
    });
  }

  function handleSolicitarAjuste() {
    if (!demand) return;
    const motivo = adjustmentReason.trim();
    if (!motivo) {
      toast.error("Informe o motivo do ajuste.");
      return;
    }
    startTransition(async () => {
      const result = await solicitarAjuste(demand.id, motivo);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ajuste solicitado. Demanda voltou para o designer.");
      onOpenChange(false);
    });
  }

  if (!demand || !mode) return null;

  const canSubmitDeliver = materialUrl.trim().length > 0;
  const canRequestAdjustment = adjustmentReason.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle className="pr-8 text-xl font-semibold tracking-tight text-foreground">
            {demand.title}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Demanda #{shortCode(demand.id)} · {demand.clientName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Briefing
            </h3>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed text-foreground">
              {demand.description?.trim() || "Sem briefing preenchido."}
            </div>
          </section>

          {mode === "deliver" && (
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entrega do material
              </h3>
              <div className="space-y-2">
                <Label htmlFor="material-url">Link do Drive / Figma</Label>
                <Input
                  id="material-url"
                  type="url"
                  placeholder="https://..."
                  value={materialUrl}
                  onChange={(e) => setMaterialUrl(e.target.value)}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link do arquivo final para enviar à Social Media.
                </p>
              </div>
            </section>
          )}

          {mode === "review" && (
            <>
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Material entregue
                </h3>
                {demand.materialUrl ? (
                  <a
                    href={demand.materialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="truncate">{demand.materialUrl}</span>
                  </a>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    Nenhum link de material anexado.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <Label htmlFor="adjustment-reason">Motivo do ajuste</Label>
                <Textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  rows={4}
                  placeholder="Descreva o que precisa ser corrigido (obrigatório para solicitar ajuste)..."
                  className="resize-none text-sm leading-relaxed"
                />
              </section>
            </>
          )}
        </div>

        <SheetFooter className="mt-auto gap-2 border-t border-border bg-muted/80 px-6 py-4 sm:flex-col sm:space-x-0">
          {mode === "claim" && (
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={handleAssumir}
            >
              {pending ? "Assumindo..." : "Assumir demanda"}
            </Button>
          )}

          {mode === "deliver" && (
            <Button
              type="button"
              className="w-full"
              disabled={pending || !canSubmitDeliver}
              onClick={handleConcluir}
            >
              {pending
                ? "Enviando..."
                : "Concluir produção e enviar para revisão"}
            </Button>
          )}

          {mode === "review" && (
            <>
              <Button
                type="button"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={pending}
                onClick={handleAprovar}
              >
                {pending ? "Aprovando..." : "Aprovar material"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                disabled={pending || !canRequestAdjustment}
                onClick={handleSolicitarAjuste}
              >
                {pending ? "Enviando..." : "Solicitar ajuste"}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DesignBoard({
  columns,
  sectorName,
}: {
  columns: BoardColumn[];
  sectorName: string;
}) {
  const [selected, setSelected] = useState<BoardDemand | null>(null);
  const [mode, setMode] = useState<SheetMode>(null);
  const [open, setOpen] = useState(false);

  function handleOpenCard(demand: BoardDemand, nextMode: SheetMode) {
    setSelected(demand);
    setMode(nextMode);
    setOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
        <div className="min-w-0">
          <Link
            href="/setores"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Setores
          </Link>
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            Quadro · {sectorName}
          </h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/setores">Todos os setores</Link>
        </Button>
      </header>

      <main className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex h-full min-h-0 min-w-max gap-4 p-6">
          {columns.map((column) => (
            <div key={column.id} className="snap-start">
              <DesignColumn
                column={column}
                onOpenCard={handleOpenCard}
              />
            </div>
          ))}
        </div>
      </main>

      <DesignDemandSheet
        demand={selected}
        mode={mode}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setMode(null);
        }}
      />
    </div>
  );
}
