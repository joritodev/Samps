"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DemandCard } from "@/components/agency/demand-card";
import { publicarDemanda } from "@/app/actions/social";
import type { BoardColumn, BoardDemand } from "@/types/board-ui";

function shortCode(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

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
        <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
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
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhum cartão
          </div>
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

  if (!demand) return null;

  const canSubmit = postUrl.trim().length > 0;

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

        <SheetFooter className="mt-auto border-t border-border bg-muted/80 px-6 py-4 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full"
            disabled={pending || !canSubmit}
            onClick={handlePublish}
          >
            {pending ? "Registrando..." : "Registrar publicação e concluir"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Painel individual</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            Meu Painel — Social Media
          </h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/setores">Setores</Link>
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-background">
        <div className="flex h-full min-h-0 min-w-max gap-4 p-6">
          {columns.map((column) => (
            <SocialColumn
              key={column.id}
              column={column}
              onOpenCard={handleOpenCard}
            />
          ))}
        </div>
      </main>

      <PublishSheet demand={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
