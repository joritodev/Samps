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

  return (
    <Card
      className={cn(
        "cursor-pointer rounded-xl border-border/60 shadow-soft transition-shadow hover:shadow-md",
        overdue && "border-destructive/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug text-foreground">
            {demand.title}
          </CardTitle>
          {demand.priority && (
            <Badge
              variant="outline"
              style={{ borderColor: demand.priority.color, color: demand.priority.color }}
              className="shrink-0 text-[10px]"
            >
              {demand.priority.name}
            </Badge>
          )}
        </div>
        {originLabel && (
          <p className="text-[11px] text-muted-foreground">{originLabel}</p>
        )}
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
          <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
            <p>Executor: {demand.timerPreview.executor.name}</p>
            <p>
              {demand.timerPreview.status === "PAUSED" ? "Pausada" : "Em execução"} há:{" "}
              {demand.timerPreview.elapsedLabel}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
