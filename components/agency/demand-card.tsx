"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
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
import { MorphWindow } from "@/components/ui/morph-window";
import { concluirBriefing } from "@/app/actions/demand";
import { canDemandBriefing, demandStatusLabel } from "@/lib/agency/labels";
import type { BoardDemand, BoardTaxonomy } from "@/types/board-ui";
import { cn } from "@/lib/utils";
import {
  DemandChips,
  DemandSummary,
  formatDeadline,
  priorityDot,
  shortCode,
} from "@/components/agency/demand-summary";

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
      data-morph-id={demand.id}
      onClick={() => onOpen(demand)}
      className="group w-full rounded-lg border border-border/80 bg-card p-3.5 text-left shadow-xs transition-[box-shadow,border-color,transform] duration-150 ease-out-soft hover:-translate-y-px hover:border-foreground/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="truncate text-xs font-medium text-muted-foreground">
        {demand.clientName}
      </p>
      <h3
        data-morph-title
        className="mt-1 font-sans text-sm font-medium leading-snug tracking-normal text-foreground"
      >
        {demand.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {demand.sector ? (
          <Badge variant="secondary">{demand.sector}</Badge>
        ) : null}
        <Badge variant="outline">
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", priorityDot(demand.priority))}
          />
          {demand.priority}
        </Badge>
        {deadline ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {deadline}
          </span>
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
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [priority, setPriority] = useState("");
  const [pending, startTransition] = useTransition();
  // A janela precisa da demanda também durante a animação de saída.
  const lastDemand = useRef<BoardDemand | null>(null);
  if (demand) lastDemand.current = demand;
  const shown = demand ?? lastDemand.current;

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
      toast.success(
        "Briefing concluído. A demanda já está disponível para o setor em Meu painel e Setores."
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  if (!shown) return null;

  const canBriefing = canDemandBriefing(shown.status, shown.briefingLockedAt);

  return (
    <MorphWindow
      open={open}
      onOpenChange={onOpenChange}
      morphId={shown.id}
      title={shown.title}
      description={`Demanda de ${shown.clientName}, ${demandStatusLabel(shown.status)}`}
      eyebrow={
        <>
          Demanda #{shortCode(shown.id)} · {shown.clientName}
        </>
      }
      chips={<DemandChips demand={shown} />}
      rail={<DemandSummary demand={shown} variant="rail" />}
      footer={
        canBriefing ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button type="button" disabled={pending} onClick={handleSubmit}>
              {pending ? "Demandando..." : "Concluir briefing e demandar"}
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-display text-[15px] font-semibold leading-none tracking-[-0.01em] text-foreground">
            Briefing e planejamento
          </h3>
          {!canBriefing ? (
            <span className="text-xs text-muted-foreground">
              Concluído: só leitura. O briefing só pode ser demandado em planejamento.
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sector">Setor responsável</Label>
            <Select value={sector} onValueChange={setSector} disabled={!canBriefing}>
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
            <Select value={priority} onValueChange={setPriority} disabled={!canBriefing}>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="briefing">Descrição do briefing</Label>
          <Textarea
            id="briefing"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Descreva o briefing da demanda..."
            className="resize-none text-sm leading-relaxed"
            disabled={!canBriefing}
          />
        </div>
      </div>
    </MorphWindow>
  );
}
