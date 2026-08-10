"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { concluirBriefing } from "@/app/actions/demand";
import { canDemandBriefing, demandStatusLabel } from "@/lib/agency/labels";
import type { BoardDemand, BoardTaxonomy } from "@/types/board-ui";

function formatDeadline(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function shortCode(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function DemandCard({
  demand,
  onOpen,
}: {
  demand: BoardDemand;
  onOpen: (demand: BoardDemand) => void;
}) {
  const deadline = formatDeadline(demand.dueDate);

  return (
    <button
      type="button"
      onClick={() => onOpen(demand)}
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {demand.clientName}
      </p>
      <h3 className="mt-1 text-sm font-medium leading-snug tracking-tight text-foreground">
        {demand.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {demand.sector ? (
          <Badge variant="outline" className="text-[10px] font-medium">
            {demand.sector}
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-[10px] font-medium">
          {demand.priority}
        </Badge>
        {deadline ? (
          <span className="text-[10px] text-muted-foreground">{deadline}</span>
        ) : null}
      </div>
    </button>
  );
}

export function DemandDetailSheet({
  demand,
  taxonomy,
  open,
  onOpenChange,
}: {
  demand: BoardDemand | null;
  taxonomy: BoardTaxonomy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [priority, setPriority] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!demand) return;
    setDescription(demand.description ?? "");
    // O cartão carrega os nomes; as actions aceitam id ou nome, então o
    // match por nome resolve o valor já selecionado.
    setSector(
      taxonomy.sectors.find((s) => s.name === demand.sector)?.id ??
        taxonomy.sectors[0]?.id ??
        ""
    );
    setPriority(
      taxonomy.priorities.find((p) => p.name === demand.priority)?.id ??
        taxonomy.priorities[0]?.id ??
        ""
    );
  }, [demand, taxonomy]);

  function handleSubmit() {
    if (!demand) return;
    startTransition(async () => {
      const result = await concluirBriefing(demand.id, {
        description,
        sector,
        priority,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Briefing concluído. Demanda disponível para o setor.");
      onOpenChange(false);
    });
  }

  if (!demand) return null;

  const canBriefing = canDemandBriefing(
    demand.status,
    (demand as { briefingLockedAt?: string | null }).briefingLockedAt
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="space-y-1 border-b border-border px-6 py-6 text-left">
          <SheetTitle className="pr-8 text-xl font-semibold tracking-tight text-foreground">
            {demand.title}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Demanda #{shortCode(demand.id)} · {demand.clientName} ·{" "}
            {demandStatusLabel(demand.status)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Planejamento
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sector">Setor responsável</Label>
                <Select
                  value={sector}
                  onValueChange={setSector}
                  disabled={!canBriefing}
                >
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxonomy.sectors.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={!canBriefing}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxonomy.priorities.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                  {formatDeadline(demand.dueDate) ?? "Sem prazo"}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Briefing
            </h3>
            <div className="space-y-2">
              <Label htmlFor="briefing">Descrição do briefing</Label>
              <Textarea
                id="briefing"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Descreva o briefing da demanda..."
                className="resize-none text-sm leading-relaxed"
                disabled={!canBriefing}
              />
            </div>
          </section>
        </div>

        <SheetFooter className="mt-auto flex-col gap-2 border-t border-border bg-muted/80 px-6 py-4 sm:flex-col sm:space-x-0">
          {canBriefing ? (
            <>
              <Button
                type="button"
                className="w-full"
                disabled={pending}
                onClick={handleSubmit}
              >
                {pending ? "Demandando..." : "Concluir briefing e demandar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-xs text-muted-foreground">
                Status atual: {demandStatusLabel(demand.status)}. O briefing só
                pode ser demandado em planejamento.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
