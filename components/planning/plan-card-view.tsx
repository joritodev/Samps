"use client";

import { CalendarClock, Check, Circle, Copy } from "lucide-react";
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

/** Card do quadro. Visual idêntico ao painel original (faixa lateral, chips, responsável e status). */
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
      className={`rounded-lg border p-2 pl-2.5 text-left shadow-[0_1px_3px_rgba(15,28,63,0.10)] ${
        kindStyle ? kindStyle.card : "border-slate-200 bg-white"
      } ${dragging ? "rotate-1 shadow-lg" : ""} ${card.required ? "ring-1 ring-amber-300" : ""}`}
      style={{
        borderLeft: `4px solid ${
          kindStyle ? kindStyle.bar : (CATEGORY_BAR[card.category] ?? CATEGORY_BAR["Outro"])
        }`,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        {canEdit && !dragging && onToggleComplete && (
          <button
            type="button"
            title={done ? "Reabrir atividade" : "Marcar como concluído"}
            aria-label={done ? `Reabrir ${card.title}` : `Concluir ${card.title}`}
            aria-pressed={done}
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
              done
                ? "border-emerald-600 bg-emerald-600 text-white"
                : kindStyle
                  ? "border-white/80 bg-transparent text-transparent hover:bg-white/20"
                  : "border-slate-400 bg-white text-transparent hover:border-emerald-600"
            }`}
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
            <p
              className={`truncate text-[11px] font-semibold uppercase tracking-wide ${
                kindStyle ? kindStyle.title : "text-[#0f1c3f]"
              }`}
            >
              {card.clientName}
            </p>
          )}
          <p className={`truncate text-xs ${kindStyle ? "text-white/90" : "text-slate-700"}`}>
            {card.title}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold ${
            kindStyle ? kindStyle.hours : "text-[#1d4ed8]"
          }`}
        >
          {formatHours(card.durationHours)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] ${
            kindStyle
              ? `border-white/30 ${kindStyle.chip} font-semibold uppercase`
              : (CATEGORY_STYLES[card.category] ?? CATEGORY_STYLES["Outro"])
          }`}
        >
          {card.kind === "video" ? card.category : kindLabel}
        </span>
        {card.required && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            Obrigatório
          </span>
        )}
        {!kindStyle && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            {kindLabel}
          </span>
        )}
        {(card.recurring || card.pinned) && (
          <span className="rounded bg-[#cffafe] px-1.5 py-0.5 text-[10px] font-semibold text-[#155e75]">
            Fixo semanal
          </span>
        )}
        {card.dueDate && (
          <span className="flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
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
              className={
                kindStyle ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-[#1d4ed8]"
              }
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
      <div
        className={`mt-1 space-y-0.5 border-t pt-1 text-[10px] ${
          kindStyle ? "border-white/30 text-white/90" : "border-slate-100 text-slate-600"
        }`}
      >
        <p>
          Responsável: <strong>{responsible ?? "A definir"}</strong>
        </p>
        <p>Status: {planStatusLabel(card.status)}</p>
        {card.notes && <p>Observação: {card.notes}</p>}
      </div>
    </article>
  );
}
