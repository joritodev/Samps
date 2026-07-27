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
import type { BoardDemand } from "@/types/board-ui";

const priorityLabel: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const statusLabel: Record<string, string> = {
  OPEN: "Pendente",
  AVAILABLE: "Disponível",
  IN_PRODUCTION: "Em produção",
  IN_ADJUSTMENT: "Em ajuste",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  PUBLISHED: "Publicada",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
};

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
  const deadline = formatDeadline(demand.deadline);

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
          {priorityLabel[demand.priority] ?? demand.priority}
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
  open,
  onOpenChange,
}: {
  demand: BoardDemand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("DESIGN");
  const [priority, setPriority] = useState("HIGH");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!demand) return;
    setDescription(demand.description ?? "");
    setSector(demand.sector ?? "DESIGN");
    setPriority(demand.priority ?? "MEDIUM");
  }, [demand]);

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
            Demanda #{shortCode(demand.id)} · {demand.clientName}
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
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="VIDEO">Vídeo</SelectItem>
                    <SelectItem value="TRAFFIC">Tráfego</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                  {formatDeadline(demand.deadline) ?? "Sem prazo"}
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
              />
            </div>
          </section>
        </div>

        <SheetFooter className="mt-auto flex-col gap-2 border-t border-border bg-muted/80 px-6 py-4 sm:flex-col sm:space-x-0">
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
            Salvar rascunho
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
