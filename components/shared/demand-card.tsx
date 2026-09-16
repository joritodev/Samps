import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DemandCardData = {
  id: string;
  title: string;
  type: string;
  format?: string | null;
  status: string;
  boardColumn?: string;
  dueDate?: Date | null;
  deliveryDate?: Date | null;
  publishDate?: Date | null;
  client?: { name: string; brandColor?: string | null };
  assignee?: { name: string; avatarUrl?: string | null } | null;
  priority?: { name: string; color: string } | null;
  sector?: { name: string; color?: string | null } | null;
  origin?: string;
  isChecklistItem?: boolean;
  parentDemand?: { title: string } | null;
  timerPreview?: {
    status: string;
    startedAt: Date;
    executor: { name: string; avatarUrl?: string | null };
    elapsedLabel: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  PENDING_PLANNING: "Pendente planejamento",
  OPEN: "Aberta",
  AVAILABLE: "Disponível",
  DEMANDED: "Demandada",
  IN_PRODUCTION: "Em produção",
  IN_REVIEW: "Em revisão",
  ADJUSTMENTS: "Ajustes",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
  PUBLISHED: "Publicada",
};

export function DemandCard({
  demand,
  showOrigin,
  className,
  onClick,
}: {
  demand: DemandCardData;
  showOrigin?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const originLabel = showOrigin && demand.client
    ? `${demand.client.name} — ${demand.origin ?? demand.type}`
    : undefined;

  const overdue =
    demand.dueDate &&
    new Date(demand.dueDate) < new Date() &&
    demand.status !== "DONE" &&
    demand.status !== "CANCELLED";

  const cardClassName = cn(
    "rounded-xl border-border/60 shadow-soft transition-shadow",
    onClick &&
      "w-full cursor-pointer text-left hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    overdue && "border-destructive/50",
    className
  );

  const body = (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug text-foreground">
            {demand.title}
          </CardTitle>
          {demand.priority && (
            <Badge
              variant="outline"
              style={{ borderColor: demand.priority.color, color: demand.priority.color }}
              className="shrink-0 text-xs"
            >
              {demand.priority.name}
            </Badge>
          )}
        </div>
        {originLabel && (
          <p className="text-xs text-muted-foreground">{originLabel}</p>
        )}
        {demand.isChecklistItem && demand.parentDemand?.title ? (
          <Badge variant="secondary" className="mt-1 text-xs font-normal">
            Parte de: {demand.parentDemand.title}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{demand.type}</Badge>
          {demand.format && <Badge variant="outline">{demand.format}</Badge>}
          <Badge variant="outline">{statusLabels[demand.status] ?? demand.status}</Badge>
          {overdue && <Badge variant="destructive">Atrasada</Badge>}
        </div>
        <div className="flex justify-between">
          {demand.dueDate && (
            <span>Prazo: {format(new Date(demand.dueDate), "dd/MM", { locale: ptBR })}</span>
          )}
          {demand.assignee && <span>{demand.assignee.name}</span>}
        </div>
        {demand.timerPreview && (
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
            <p>Executor: {demand.timerPreview.executor.name}</p>
            <p>
              {demand.timerPreview.status === "PAUSED" ? "Pausada" : "Em execução"} há:{" "}
              <span className="tabular-nums">{demand.timerPreview.elapsedLabel}</span>
            </p>
          </div>
        )}
      </CardContent>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        draggable={false}
        onClick={onClick}
        className={cn("border bg-card text-card-foreground", cardClassName)}
      >
        {body}
      </button>
    );
  }

  return <Card className={cardClassName}>{body}</Card>;
}
