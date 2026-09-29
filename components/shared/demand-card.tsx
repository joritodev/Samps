import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  demandOriginLabel,
  demandStatusLabel,
  demandTypeLabel,
} from "@/lib/agency/labels";
import { cn, userInitials } from "@/lib/utils";

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
  linkedChecklistItem?: { checklist: { title: string } } | null;
  timerPreview?: {
    status: string;
    startedAt: Date;
    executor: { name: string; avatarUrl?: string | null };
    elapsedLabel: string;
  } | null;
};

export function DemandCard({
  demand,
  showOrigin,
  className,
  onClick,
  href,
  titleAs: TitleTag = "h3",
}: {
  demand: DemandCardData;
  showOrigin?: boolean;
  className?: string;
  onClick?: () => void;
  /** Card vira link (ex.: painel abre a demanda no quadro geral). */
  href?: string;
  /** Nível do título conforme a hierarquia da página. */
  titleAs?: "h2" | "h3" | "h4";
}) {
  const originLabel =
    showOrigin && demand.client
      ? `${demand.client.name} · ${
          demand.origin
            ? demandOriginLabel(demand.origin)
            : demandTypeLabel(demand.type)
        }`
      : undefined;

  const overdue =
    demand.dueDate &&
    new Date(demand.dueDate) < new Date() &&
    demand.status !== "DONE" &&
    demand.status !== "CANCELLED";

  const cardClassName = cn(
    "group/card flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-3.5 text-card-foreground shadow-xs transition-[box-shadow,border-color,transform] duration-150 ease-out-soft",
    (onClick || href) &&
      "w-full cursor-pointer text-left hover:-translate-y-px hover:border-foreground/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    overdue && "border-destructive/40",
    className
  );

  const body = (
    <>
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <TitleTag className="font-sans text-sm font-medium leading-snug tracking-normal text-foreground">
            {demand.title}
          </TitleTag>
          {demand.priority && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-xs font-medium text-muted-foreground dark:bg-foreground/[0.08]">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: demand.priority.color }}
              />
              {demand.priority.name}
            </span>
          )}
        </div>
        {originLabel && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {demand.client?.brandColor ? (
              <span
                aria-hidden
                className="size-2 rounded-[3px]"
                style={{ backgroundColor: demand.client.brandColor }}
              />
            ) : null}
            {originLabel}
          </p>
        )}
        {demand.isChecklistItem && demand.parentDemand?.title ? (
          <Badge variant="secondary" className="h-auto py-0.5 font-normal">
            {demand.linkedChecklistItem?.checklist.title
              ? `Parte de: ${demand.parentDemand.title} · ${demand.linkedChecklistItem.checklist.title}`
              : `Parte de: ${demand.parentDemand.title}`}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary">{demandTypeLabel(demand.type)}</Badge>
        {demand.format && <Badge variant="outline">{demand.format}</Badge>}
        <Badge variant="outline">{demandStatusLabel(demand.status)}</Badge>
        {overdue && <Badge variant="destructive">Atrasada</Badge>}
      </div>

      {demand.dueDate || demand.assignee ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-xs text-muted-foreground">
          {demand.dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                overdue && "font-medium text-destructive"
              )}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {format(new Date(demand.dueDate), "dd MMM", { locale: ptBR })}
            </span>
          ) : (
            <span />
          )}
          {demand.assignee && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-xs font-semibold leading-none text-foreground"
              >
                {userInitials(demand.assignee.name)}
              </span>
              <span className="truncate">{demand.assignee.name}</span>
            </span>
          )}
        </div>
      ) : null}

      {demand.timerPreview && (
        <div className="flex items-center gap-2 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-200">
          <Timer className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {demand.timerPreview.executor.name} ·{" "}
            {demand.timerPreview.status === "PAUSED" ? "Pausada" : "Em execução"} há
          </span>
          <span className="font-medium tabular-nums">
            {demand.timerPreview.elapsedLabel}
          </span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} draggable={false} className={cardClassName}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        draggable={false}
        onClick={onClick}
        className={cardClassName}
      >
        {body}
      </button>
    );
  }

  return <div className={cardClassName}>{body}</div>;
}
