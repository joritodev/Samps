"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanMemberData } from "@/lib/agency/planning/types";
import { WEEKDAYS, dayDate, formatShortDate } from "@/lib/agency/planning/week";
import type { DistributionMoveView, DistributionPreview } from "@/lib/services/planning-distribution.service";

export function DistributionDialog({
  data,
  members,
  busy,
  onVariant,
  onRelax,
  onApply,
  onClose,
}: {
  data: DistributionPreview;
  members: PlanMemberData[];
  busy: boolean;
  onVariant: () => void;
  onRelax: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const place = (memberId: string | null, weekday: number | null) =>
    memberId && weekday
      ? `${WEEKDAYS.find((d) => d.value === weekday)?.short ?? ""} • ${
          members.find((m) => m.id === memberId)?.name ?? ""
        }`
      : "Não alocado";
  const sourcePlace = (move: DistributionMoveView) => {
    if (!move.fromMemberId || !move.fromWeekday) return "Não alocado";
    const date = dayDate({ year: move.fromYear, week: move.fromWeek }, move.fromWeekday);
    return `${formatShortDate(date)} • ${place(move.fromMemberId, move.fromWeekday)}`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Sugestão de distribuição {data.relaxed ? "(liberando protegidos)" : ""}</DialogTitle>
        </DialogHeader>
        {data.unplaced.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              {data.unplaced.length} demanda(s) não couberam mantendo os cards já planejados.
            </p>
            <p className="mt-1 text-xs">{data.unplaced.map((c) => c.title).join(", ")}</p>
            {!data.relaxed && (
              <Button size="sm" variant="outline" className="mt-2" onClick={onRelax} disabled={busy}>
                Ver opção movendo cards já planejados
              </Button>
            )}
          </div>
        )}
        {data.moves.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Não há uma alocação disponível para as demandas pendentes neste período.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.moves.map((m) => (
              <li
                key={m.cardId}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <strong className="text-[#0f1c3f]">{m.title}</strong>
                  {m.clientName ? ` — ${m.clientName}` : ""}
                </span>
                <span className="shrink-0 text-right text-xs text-slate-600">
                  {sourcePlace(m)} → {m.toDate.split("-").reverse().join("/")} • {place(m.toMemberId, m.toWeekday)}
                  {m.outsideOriginalWeek && (
                    <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">
                      Sem vaga na semana original — sugerido fora dela
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Manter como está
          </Button>
          <Button variant="outline" onClick={onVariant} disabled={busy}>
            <Sparkles className="mr-1 h-4 w-4" /> Outra sugestão
          </Button>
          <Button onClick={onApply} disabled={busy || !data.moves.length || data.unplaced.length > 0}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
