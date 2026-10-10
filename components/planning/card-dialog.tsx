"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { listLinkableDemandsAction } from "@/lib/actions/planning.actions";
import type { PlanCardInput } from "@/lib/agency/planning/card-input";
import {
  DURATION_PRESETS,
  KIND_DEFAULT_HOURS,
  KIND_DURATION_OPTIONS,
  PLAN_SECTOR_CONFIG,
  PLAN_STATUSES,
} from "@/lib/agency/planning/config";
import type {
  PlanCardData,
  PlanMemberData,
  PlanPresetData,
  PlanSectorSlug,
} from "@/lib/agency/planning/types";
import { WEEKDAYS } from "@/lib/agency/planning/week";
import { DesignCalculator } from "./design-calculator";
import type { LinkableDemand } from "@/lib/services/planning.service";

export type CardDraft = {
  id?: string;
  kind: string;
  clientId: string | null;
  clientName: string;
  title: string;
  category: string;
  durationHours: number;
  status: string;
  recurring: boolean;
  required: boolean;
  notes: string;
  weekday: number | null;
  memberId: string | null;
  dueDate: string;
  demandId: string | null;
};

export function emptyDraft(sector: PlanSectorSlug): CardDraft {
  const config = PLAN_SECTOR_CONFIG[sector];
  return {
    kind: config.defaultKind,
    clientId: null,
    clientName: "",
    title: "",
    category: config.defaultCategory,
    durationHours: 1,
    status: "PROGRAMADO",
    recurring: false,
    required: false,
    notes: "",
    weekday: null,
    memberId: null,
    dueDate: "",
    demandId: null,
  };
}

export function cardToDraft(card: PlanCardData): CardDraft {
  return {
    id: card.id,
    kind: card.kind,
    clientId: card.clientId,
    clientName: card.clientName ?? "",
    title: card.title,
    category: card.category,
    durationHours: card.durationHours,
    status: card.status,
    recurring: card.recurring || card.pinned,
    required: card.required,
    notes: card.notes ?? "",
    weekday: card.weekday,
    memberId: card.memberId,
    dueDate: card.dueDate ?? "",
    demandId: card.demandId,
  };
}

export function draftToInput(draft: CardDraft): PlanCardInput {
  return {
    title: draft.title,
    kind: draft.kind,
    category: draft.category,
    durationHours: draft.durationHours,
    status: draft.status,
    weekday: draft.weekday,
    memberId: draft.memberId,
    clientId: draft.clientId,
    clientName: draft.clientName,
    demandId: draft.demandId,
    dueDate: draft.dueDate || null,
    notes: draft.notes,
    required: draft.required,
    recurring: draft.recurring,
  };
}

const selectClass = "h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground";

export function CardDialog({
  draft,
  sector,
  members,
  clients,
  presets,
  saving,
  canDelete,
  onChange,
  onClose,
  onSave,
  onDelete,
  onMove,
}: {
  draft: CardDraft;
  sector: PlanSectorSlug;
  members: PlanMemberData[];
  clients: { id: string; name: string }[];
  presets: PlanPresetData[];
  saving: boolean;
  canDelete: boolean;
  onChange: (draft: CardDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: () => void;
}) {
  const config = PLAN_SECTOR_CONFIG[sector];
  const kindOptions = KIND_DURATION_OPTIONS[draft.kind];
  const durationOptions =
    kindOptions ??
    (presets.length ? presets.map((p) => ({ label: p.label, hours: p.hours })) : DURATION_PRESETS);

  const [demands, setDemands] = useState<LinkableDemand[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!draft.clientId) {
      setDemands([]);
      return;
    }
    void listLinkableDemandsAction(draft.clientId).then((result) => {
      if (!cancelled) setDemands("demands" in result ? result.demands : []);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.clientId]);

  const clientSelectValue = draft.clientId
    ? draft.clientId
    : draft.clientName
      ? "__custom"
      : "";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar card" : "Novo card"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-kind">Tipo</Label>
              <select
                id="plan-kind"
                className={selectClass}
                value={draft.kind}
                onChange={(e) => {
                  const nextKind = e.target.value;
                  const suggested = KIND_DEFAULT_HOURS[nextKind];
                  // Só sugere a duração padrão se a pessoa ainda não escolheu outra.
                  const untouched =
                    draft.durationHours === 1 || draft.durationHours === KIND_DEFAULT_HOURS[draft.kind];
                  onChange({
                    ...draft,
                    kind: nextKind,
                    durationHours: suggested && untouched ? suggested : draft.durationHours,
                  });
                }}
              >
                {config.kinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-category">Categoria</Label>
              <select
                id="plan-category"
                className={selectClass}
                value={draft.category}
                onChange={(e) => onChange({ ...draft, category: e.target.value })}
              >
                {config.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-client">Cliente</Label>
            <select
              id="plan-client"
              className={selectClass}
              value={clientSelectValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom") {
                  onChange({ ...draft, clientId: null, demandId: null });
                  return;
                }
                if (!value) {
                  onChange({ ...draft, clientId: null, clientName: "", demandId: null });
                  return;
                }
                const client = clients.find((c) => c.id === value);
                onChange({
                  ...draft,
                  clientId: value,
                  clientName: client?.name ?? "",
                  demandId: draft.clientId === value ? draft.demandId : null,
                });
              }}
            >
              <option value="">Sem cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__custom">Outro (digitar)</option>
            </select>
            {!draft.clientId && (
              <Input
                placeholder="Ou digite o nome do cliente"
                maxLength={80}
                value={draft.clientName}
                onChange={(e) => onChange({ ...draft, clientName: e.target.value })}
              />
            )}
          </div>
          {draft.clientId && (
            <div className="space-y-1">
              <Label htmlFor="plan-demand">Demanda do Samps (opcional)</Label>
              <select
                id="plan-demand"
                className={selectClass}
                value={draft.demandId ?? ""}
                onChange={(e) => {
                  const demand = demands.find((d) => d.id === e.target.value);
                  onChange({
                    ...draft,
                    demandId: e.target.value || null,
                    title: demand && !draft.title.trim() ? demand.title : draft.title,
                    dueDate: demand?.dueDate && !draft.dueDate && !draft.recurring ? demand.dueDate : draft.dueDate,
                  });
                }}
              >
                <option value="">Sem demanda vinculada</option>
                {draft.demandId && !demands.some((d) => d.id === draft.demandId) && (
                  <option value={draft.demandId}>Demanda vinculada</option>
                )}
                {demands.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                    {d.dueDate ? ` — prazo ${d.dueDate.split("-").reverse().join("/")}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="plan-title">Nome do card</Label>
            <Input
              id="plan-title"
              maxLength={120}
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
            />
          </div>
          {sector === "design" && (
            <DesignCalculator
              kind={draft.kind}
              presets={presets}
              onApply={(hours) => onChange({ ...draft, durationHours: hours })}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className={`space-y-1 ${sector === "design" ? "hidden" : ""}`}>
              <Label htmlFor="plan-duration">Duração</Label>
              <select
                id="plan-duration"
                className={selectClass}
                value={
                  durationOptions.some((p) => p.hours === draft.durationHours)
                    ? String(draft.durationHours)
                    : "custom"
                }
                onChange={(e) => {
                  if (e.target.value === "custom") return;
                  onChange({ ...draft, durationHours: Number(e.target.value) });
                }}
              >
                {durationOptions.map((p) => (
                  <option key={p.label} value={p.hours}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Personalizada</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-hours">Horas</Label>
              <Input
                id="plan-hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={draft.durationHours}
                onChange={(e) => onChange({ ...draft, durationHours: Number(e.target.value) || 0.25 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-weekday">Dia</Label>
              <select
                id="plan-weekday"
                className={selectClass}
                value={draft.weekday ?? ""}
                onChange={(e) =>
                  onChange({ ...draft, weekday: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">Não alocado (backlog)</option>
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-member">Responsável</Label>
              <select
                id="plan-member"
                className={selectClass}
                value={draft.memberId ?? ""}
                onChange={(e) => onChange({ ...draft, memberId: e.target.value || null })}
              >
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-status">Status</Label>
              <select
                id="plan-status"
                className={selectClass}
                value={draft.status}
                onChange={(e) => onChange({ ...draft, status: e.target.value })}
              >
                {PLAN_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => onChange({ ...draft, required: e.target.checked })}
              />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={draft.recurring}
                onChange={(e) => onChange({ ...draft, recurring: e.target.checked })}
              />
              Fixo semanal
            </label>
          </div>
          {!draft.recurring && (
            <div className="space-y-1">
              <Label htmlFor="plan-due">Entregar até (opcional)</Label>
              <Input
                id="plan-due"
                type="date"
                value={draft.dueDate}
                onChange={(e) => onChange({ ...draft, dueDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                A distribuição automática nunca joga o card para depois desta data.
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="plan-notes">Observação</Label>
            <Textarea
              id="plan-notes"
              rows={2}
              maxLength={500}
              value={draft.notes}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {draft.id && (
              <Button variant="outline" onClick={onMove} disabled={saving}>
                <CalendarDays className="mr-1 h-4 w-4" /> Mover
              </Button>
            )}
            {draft.id && canDelete && (
              <Button variant="destructive" onClick={onDelete} disabled={saving}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
