import Link from "next/link";
import { ExternalLink, Timer, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demandStatusLabel } from "@/lib/agency/labels";
import { relativeDue } from "@/lib/agency/attention";
import { assigneeHref } from "@/lib/agency/demand-filters";
import { cn } from "@/lib/utils";
import type { BoardDemand } from "@/types/board-ui";

export function formatDeadline(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export /** Ponto de cor da prioridade (nomes vêm do catálogo configurável). */
function priorityDot(priority: string) {
  const p = priority.toLowerCase();
  if (p.includes("urgent") || p.includes("crít")) return "bg-destructive";
  if (p.includes("alta")) return "bg-brand";
  if (p.includes("méd") || p.includes("med")) return "bg-warning";
  return "bg-muted-foreground/50";
}

export function shortCode(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** Onde a demanda está agora: etapa, responsável, prazo e produção. */
export function DemandSummary({
  demand,
  variant = "boxed",
}: {
  demand: BoardDemand;
  variant?: "boxed" | "rail";
}) {
  const now = new Date();
  const overdue =
    demand.dueDate &&
    new Date(demand.dueDate) < now &&
    !["DONE", "CANCELLED", "PUBLISHED"].includes(demand.status);

  return (
    <section aria-labelledby="andamento-titulo" className="space-y-4">
      <h3
        id="andamento-titulo"
        className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground"
      >
        Andamento
      </h3>
      <dl
        className={cn(
          variant === "rail"
            ? "grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1"
            : "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 [&>div]:bg-card [&>div]:px-3.5 [&>div]:py-3"
        )}
      >
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Etapa</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {demandStatusLabel(demand.status)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Prazo</dt>
          <dd
            className={cn(
              "mt-1 text-sm font-semibold",
              overdue ? "text-destructive" : "text-foreground"
            )}
          >
            {demand.dueDate ? (
              <>
                {formatDeadline(demand.dueDate)}
                <span className="block text-xs font-medium">
                  {relativeDue(demand.dueDate, now)}
                </span>
              </>
            ) : (
              "Sem prazo"
            )}
          </dd>
        </div>
        {demand.assigneeName !== undefined ? (
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Responsável</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
            {demand.assigneeName ? (
              <span className="text-foreground">{demand.assigneeName}</span>
            ) : (
              <span className="text-warning">Sem responsável</span>
            )}
          </dd>
        </div>
        ) : null}
        {demand.assigneeName !== undefined ? (
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Produção</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Timer className="size-3.5 text-muted-foreground" aria-hidden />
            {demand.producingBy ? (
              <span>
                <span className="text-success">Rodando</span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {demand.producingBy}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Parada</span>
            )}
          </dd>
        </div>
        ) : null}
      </dl>
      <div className={cn("flex flex-wrap gap-2", variant === "rail" && "md:flex-col md:items-start")}>
        {demand.assigneeId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={assigneeHref(demand.assigneeId)}>
              Fila de {demand.assigneeName?.split(" ")[0]}
            </Link>
          </Button>
        ) : null}
        {demand.clientId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/clientes/${demand.clientId}`}>
              <ExternalLink className="size-3.5" aria-hidden />
              Quadro de {demand.clientName}
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Chips de status na barra de título da janela de detalhe. */
export function DemandChips({ demand }: { demand: BoardDemand }) {
  const overdue =
    !!demand.dueDate &&
    new Date(demand.dueDate) < new Date() &&
    !["DONE", "CANCELLED", "PUBLISHED"].includes(demand.status);
  return (
    <>
      <Badge variant="default">{demandStatusLabel(demand.status)}</Badge>
      {demand.sector ? <Badge variant="secondary">{demand.sector}</Badge> : null}
      <Badge variant="outline">
        <span aria-hidden className={cn("size-1.5 rounded-full", priorityDot(demand.priority))} />
        {demand.priority}
      </Badge>
      {overdue ? <Badge variant="destructive">Atrasada</Badge> : null}
    </>
  );
}
