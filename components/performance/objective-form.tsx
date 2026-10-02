"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createObjectiveAction, updateObjectiveAction } from "@/lib/actions/okr.actions";
import { GOAL_SCOPE_LABEL, GOAL_SCOPES, presetPeriod, type GoalScope } from "@/lib/agency/goals";
import { canBeParent } from "@/lib/agency/okr";
import { dayKey } from "@/lib/agency/sp-calendar";
import type { ObjectiveView } from "@/lib/services/okr.service";

type Option = { id: string; name: string };

const SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ObjectiveForm({
  open,
  onOpenChange,
  initial,
  sectors,
  people,
  parents,
  defaultOwnerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ObjectiveView | null;
  sectors: Option[];
  people: Option[];
  /** Objetivos que podem ser pai (qualquer um; o formulário filtra pelo escopo). */
  parents: ObjectiveView[];
  defaultOwnerId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [scope, setScope] = useState<GoalScope>("AGENCY");
  const [sectorId, setSectorId] = useState("");
  const [userId, setUserId] = useState("");
  const [parentId, setParentId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setOwnerId(initial.ownerId);
      setScope(initial.scope);
      setSectorId(initial.sectorId ?? "");
      setUserId(initial.userId ?? "");
      setParentId(initial.parentId ?? "");
      setStartsOn(dayKey(new Date(initial.startsOn)));
      setEndsOn(dayKey(new Date(initial.endsOn)));
      return;
    }
    const quarter = presetPeriod("quarter");
    setTitle("");
    setDescription("");
    setOwnerId(defaultOwnerId);
    setScope("AGENCY");
    setSectorId("");
    setUserId("");
    setParentId("");
    setStartsOn(quarter.startsOn);
    setEndsOn(quarter.endsOn);
  }, [open, initial, defaultOwnerId]);

  const parentOptions = parents.filter((p) => p.id !== initial?.id && canBeParent(p.scope, scope));

  function applyPreset(preset: "month" | "quarter") {
    const period = presetPeriod(preset);
    setStartsOn(period.startsOn);
    setEndsOn(period.endsOn);
  }

  function save() {
    startTransition(async () => {
      const payload = {
        title,
        description,
        ownerId,
        scope,
        sectorId: scope === "SECTOR" ? sectorId : null,
        userId: scope === "USER" ? userId : null,
        parentId: parentOptions.some((p) => p.id === parentId) ? parentId : null,
        startsOn,
        endsOn,
      };
      const result = initial
        ? await updateObjectiveAction(initial.id, payload)
        : await createObjectiveAction(payload);
      if ("success" in result && result.success) {
        toast.success(initial ? "Objetivo atualizado" : "Objetivo criado");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível salvar");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Editar objetivo" : "Novo objetivo"}</SheetTitle>
          <SheetDescription>
            O objetivo diz onde chegar; os resultados-chave dizem como saber que chegou.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ob-title">Objetivo</Label>
            <Input id="ob-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Entregar com consistência" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-desc">Descrição (opcional)</Label>
            <Input id="ob-desc" value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} placeholder="Por que isso importa agora" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-owner">Dono</Label>
            <select id="ob-owner" className={SELECT_CLASS} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">O dono faz os check-ins dos resultados manuais.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-scope">Para quem</Label>
            <select id="ob-scope" className={SELECT_CLASS} value={scope} onChange={(e) => setScope(e.target.value as GoalScope)}>
              {GOAL_SCOPES.map((s) => (
                <option key={s} value={s}>{GOAL_SCOPE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          {scope === "SECTOR" ? (
            <div className="space-y-1">
              <Label htmlFor="ob-sector">Setor</Label>
              <select id="ob-sector" className={SELECT_CLASS} value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
                <option value="">Escolha o setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {scope === "USER" ? (
            <div className="space-y-1">
              <Label htmlFor="ob-user">Pessoa</Label>
              <select id="ob-user" className={SELECT_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Escolha a pessoa</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {scope !== "AGENCY" ? (
            <div className="space-y-1">
              <Label htmlFor="ob-parent">Desdobra qual objetivo? (opcional)</Label>
              <select id="ob-parent" className={SELECT_CLASS} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Nenhum</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>Mês atual</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("quarter")}>Trimestre atual</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ob-from" className="text-xs text-muted-foreground">De</Label>
                <Input id="ob-from" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ob-to" className="text-xs text-muted-foreground">Até</Label>
                <Input id="ob-to" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar objetivo"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
