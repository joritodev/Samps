"use client";

import { CalendarClock, Check, Circle, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_BAR,
  CATEGORY_STYLES,
  KIND_STYLES,
  planStatusLabel,
} from "@/lib/agency/planning/config";
import type { PlanCardData, PlanMemberData } from "@/lib/agency/planning/types";
import { formatHours } from "@/lib/agency/planning/week";

export type PlanCardViewProps = {
  card: PlanCardData;
  members?: PlanMemberData[];
  kinds: readonly { value: string; label: string }[];
  dragging?: boolean;
  /** Quem pode criar e mover cards (planning.edit). */
  canEdit?: boolean;
  onEdit?: (card: PlanCardData) => void;
  onDuplicate?: (card: PlanCardData) => void;
  onToggleComplete?: (card: PlanCardData) => void;
};

const chip = "rounded border px-1.5 py-0.5 text-[10px]";

/** Card do quadro: faixa lateral por categoria, chips, responsável e status, só com tokens do tema. */
export function PlanCardView({
  card,
  members = [],
  kinds,
  dragging,
  canEdit,
  onEdit,
  onDuplicate,
  onToggleComplete,
}: PlanCardViewProps) {
  const kindLabel = kinds.find((k) => k.value === card.kind)?.label ?? card.kind;
  const responsible = members.find((member) => member.id === card.memberId)?.name;
  const kindStyle = KIND_STYLES[card.kind];
  const done = card.status === "CONCLUIDO";
  const interactive = Boolean(canEdit && !dragging && onEdit);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={() => interactive && onEdit?.(card)}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onEdit?.(card);
        }
      }}
      className={cn(
        "rounded-lg border p-2 pl-2.5 text-left text-foreground shadow-xs transition-colors",
        kindStyle ? kindStyle.card : "border-border bg-card",
        interactive && "cursor-pointer hover:border-primary/40",
        done && "opacity-75",
        dragging && "rotate-1 shadow-lg",
        card.required && "ring-1 ring-warning/50",
      )}
      style={{
        borderLeft: `4px solid ${kindStyle ? kindStyle.bar : (CATEGORY_BAR[card.category] ?? CATEGORY_BAR["Outro"])}`,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        {canEdit && !dragging && onToggleComplete && (
          <button
            type="button"
            title={done ? "Reabrir atividade" : "Marcar como concluído"}
            aria-label={done ? `Reabrir ${card.title}` : `Concluir ${card.title}`}
            aria-pressed={done}
            className={cn(
              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
              done
                ? "border-success bg-success text-success-foreground"
                : "border-muted-foreground/50 bg-card text-transparent hover:border-success",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleComplete(card);
            }}
          >
            {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-0 w-0" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {card.clientName && (
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
              {card.clientName}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">{card.title}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary-ink">
          {formatHours(card.durationHours)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {/* Categoria sempre; o tipo vem no chip seguinte (captação e roteiro têm o próprio destaque). */}
        <span
          className={cn(
            chip,
            kindStyle
              ? "border-foreground/15 bg-foreground/[0.06] font-semibold uppercase text-foreground"
              : (CATEGORY_STYLES[card.category] ?? CATEGORY_STYLES["Outro"]),
          )}
        >
          {kindStyle ? kindLabel : card.category}
        </span>
        {card.required && (
          <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warning-ink dark:bg-warning/15 dark:text-amber-300">
            Obrigatório
          </span>
        )}
        {!kindStyle && (
          <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground dark:bg-foreground/10">
            {kindLabel}
          </span>
        )}
        {(card.recurring || card.pinned) && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-ink dark:bg-primary/15">
            Fixo semanal
          </span>
        )}
        {card.dueDate && (
          <span className="flex items-center gap-1 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-[hsl(16_80%_36%)] dark:text-brand">
            <CalendarClock className="h-3 w-3" />
            Entrega {card.dueDate.split("-").reverse().join("/")}
          </span>
        )}
        {canEdit && !dragging && onDuplicate && (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              title="Duplicar para demandas não alocadas"
              aria-label={`Duplicar ${card.title}`}
              className="text-muted-foreground hover:text-primary"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate(card);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="mt-1 space-y-0.5 border-t border-border/60 pt-1 text-[10px] text-muted-foreground">
        <p>
          Responsável: <strong className="font-semibold text-foreground">{responsible ?? "A definir"}</strong>
        </p>
        <p>Status: {planStatusLabel(card.status)}</p>
        {card.notes && <p>Observação: {card.notes}</p>}
      </div>
    </article>
  );
}
