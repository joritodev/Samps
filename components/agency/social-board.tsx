"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MorphWindow } from "@/components/ui/morph-window";
import { DemandChips, DemandSummary, shortCode } from "@/components/agency/demand-summary";
import { BoardColumnEmpty } from "@/components/board/board-column-empty";
import { DemandCard } from "@/components/agency/demand-card";
import { publicarDemanda } from "@/app/actions/social";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

function SocialColumn({
  column,
  onOpenCard,
}: {
  column: BoardColumn;
  onOpenCard: (demand: BoardDemand) => void;
}) {
  const canPublish = column.id === "awaiting_publish";

  return (
    <section className="flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/80">
      <header className="flex shrink-0 items-center justify-between px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
        <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {column.cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <DemandCard
              key={card.id}
              demand={card}
              onOpen={
                canPublish
                  ? onOpenCard
                  : () => toast.message("Publicação já registrada.")
              }
            />
          ))
        ) : (
          <BoardColumnEmpty description="Aguarde novas demandas nesta etapa." />
        )}
      </div>
    </section>
  );
}

function PublishSheet({
  demand,
  open,
  onOpenChange,
}: {
  demand: BoardDemand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [postUrl, setPostUrl] = useState("");
  const [pending, startTransition] = useTransition();
  // A janela precisa da demanda também durante a saída animada.
  const last = useRef<BoardDemand | null>(null);
  if (demand) last.current = demand;

  useEffect(() => {
    if (!demand) return;
    setPostUrl(demand.publishedUrl ?? "");
  }, [demand]);

  function handlePublish() {
    if (!demand) return;
    const url = postUrl.trim();
    if (!url) {
      toast.error("O link da publicação é obrigatório");
      return;
    }
    startTransition(async () => {
      const result = await publicarDemanda(demand.id, url);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Publicação registrada. Demanda concluída.");
      onOpenChange(false);
    });
  }

  const sd = demand ?? last.current;
  if (!sd) return null;

  const canSubmit = postUrl.trim().length > 0;

  return (
    <MorphWindow
      open={open}
      onOpenChange={onOpenChange}
      morphId={sd.id}
      size="md"
      title={sd.title}
      description={`Demanda de ${sd.clientName}`}
      eyebrow={
        <>
          Demanda #{shortCode(sd.id)} · {sd.clientName}
        </>
      }
      chips={<DemandChips demand={sd} />}
      rail={<DemandSummary demand={sd} variant="rail" />}
      footer={
        <Button
          type="button"
          disabled={pending || !canSubmit}
          onClick={handlePublish}
        >
          {pending ? "Registrando..." : "Registrar publicação e concluir"}
        </Button>
      }
    >
      <div className="space-y-8">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Briefing
            </h3>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed text-foreground">
              {sd.description?.trim() || "Sem briefing preenchido."}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Material entregue
            </h3>
            {sd.materialUrl ? (
              <a
                href={sd.materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">{sd.materialUrl}</span>
              </a>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                Nenhum material anexado.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Publicação final
            </h3>
            <div className="space-y-2">
              <Label htmlFor="post-url">
                Link da publicação (Instagram / TikTok…)
              </Label>
              <Input
                id="post-url"
                type="url"
                placeholder="https://..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="h-10"
              />
            </div>
          </section>
      </div>
    </MorphWindow>
  );
}

export function SocialBoard({ columns }: { columns: BoardColumn[] }) {
  const [selected, setSelected] = useState<BoardDemand | null>(null);
  const [open, setOpen] = useState(false);

  function handleOpenCard(demand: BoardDemand) {
    setSelected(demand);
    setOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex shrink-0 items-center justify-between gap-4 bg-background px-6 pb-3 pt-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Painel individual</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            Meu painel · Social Media
          </h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/setores">Setores</Link>
        </Button>
      </header>

      <main className="min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex h-full min-h-0 min-w-max gap-4 p-6">
          {columns.map((column) => (
            <div key={column.id} className="snap-start">
              <SocialColumn
                column={column}
                onOpenCard={handleOpenCard}
              />
            </div>
          ))}
        </div>
      </main>

      <PublishSheet demand={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
