"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capacityFor } from "@/lib/agency/planning/capacity";
import type {
  IsAbsentFn,
  PlanCapacityOverrideData,
  PlanCardData,
  PlanDayBlockData,
  PlanMemberData,
} from "@/lib/agency/planning/types";
import { dayDate, formatHours, isoWeekOfKey } from "@/lib/agency/planning/week";
import { isValidDayKey } from "@/lib/agency/sp-calendar";

export function MoveCardDialog({
  card,
  members,
  overrides,
  blocks,
  cards,
  isAbsent,
  onConfirm,
  onClose,
}: {
  card: PlanCardData;
  members: PlanMemberData[];
  overrides: PlanCapacityOverrideData[];
  blocks: PlanDayBlockData[];
  cards: PlanCardData[];
  isAbsent: IsAbsentFn;
  onConfirm: (dateKey: string | null, memberId: string | null) => void | Promise<void>;
  onClose: () => void;
}) {
  const initial =
    card.weekday && card.memberId
      ? dayDate({ year: card.isoYear, week: card.isoWeek }, card.weekday).toISOString().slice(0, 10)
      : "";
  const [dateKey, setDateKey] = useState(initial);
  const [memberId, setMemberId] = useState(card.memberId ?? members[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const validDate = isValidDayKey(dateKey);
  const [y, m, d] = validDate ? dateKey.split("-").map(Number) : [0, 0, 0];
  const weekday = validDate ? new Date(y!, m! - 1, d!).getDay() || 7 : null;
  const sunday = weekday === 7;
  const targetWeek = validDate && !sunday ? isoWeekOfKey(dateKey) : null;
  const member = members.find((x) => x.id === memberId);

  const blocked =
    targetWeek && weekday
      ? blocks.some(
          (b) =>
            b.isoYear === targetWeek.year &&
            b.isoWeek === targetWeek.week &&
            b.weekday === weekday &&
            (b.memberId === null || b.memberId === memberId),
        )
      : false;
  const capacity =
    member && targetWeek && weekday
      ? capacityFor(member, targetWeek, weekday, overrides, blocks, isAbsent)
      : 0;
  const used =
    targetWeek && weekday
      ? cards
          .filter(
            (c) =>
              c.id !== card.id &&
              c.memberId === memberId &&
              c.weekday === weekday &&
              c.isoYear === targetWeek.year &&
              c.isoWeek === targetWeek.week,
          )
          .reduce((sum, c) => sum + c.durationHours, 0)
      : 0;
  const overloaded = Boolean(targetWeek && used + card.durationHours > capacity + 0.001);
  const lateDelivery = Boolean(card.dueDate && validDate && dateKey > card.dueDate);

  async function confirm(key: string | null, id: string | null) {
    setSaving(true);
    await onConfirm(key, id);
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>Mover “{card.title}” para…</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="move-date" className="text-xs uppercase tracking-wide text-muted-foreground">
              Data
            </Label>
            <Input
              id="move-date"
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="move-member" className="text-xs uppercase tracking-wide text-muted-foreground">
              Responsável
            </Label>
            <select
              id="move-member"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              {members.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          {sunday && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              O quadro vai de segunda a sábado. Escolha outra data.
            </p>
          )}
          {blocked && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              Este dia está bloqueado para o responsável escolhido.
            </p>
          )}
          {overloaded && !blocked && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-xs font-medium text-warning-ink">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />A carga do dia ficará em{" "}
              {formatHours(used + card.durationHours)} de {formatHours(capacity)}.
            </p>
          )}
          {lateDelivery && (
            <p className="rounded-md bg-brand/15 px-3 py-2 text-xs font-medium text-[hsl(16_80%_36%)] dark:text-brand">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />A data escolhida passa do prazo de
              entrega ({card.dueDate?.split("-").reverse().join("/")}).
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" disabled={saving} onClick={() => void confirm(null, null)}>
            Mover para não alocadas
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              disabled={!validDate || sunday || !memberId || saving}
              onClick={() => void confirm(dateKey, memberId)}
            >
              Mover
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
