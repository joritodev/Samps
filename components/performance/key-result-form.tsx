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
import { addKeyResultAction, updateKeyResultAction } from "@/lib/actions/okr.actions";
import { metricUnitSuffix } from "@/lib/agency/goals";
import { kpiFromField, kpiToField } from "@/lib/agency/kpi-input";
import { KPI_CATALOG, KPI_KEYS, type KpiKey } from "@/lib/agency/performance-summary";
import type { KeyResultView } from "@/lib/services/okr.service";

const SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type KeyResultTarget = { objectiveId: string; initial: KeyResultView | null };

export function KeyResultForm({
  target,
  onOpenChange,
}: {
  target: KeyResultTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"KPI" | "MANUAL">("KPI");
  const [metric, setMetric] = useState<KpiKey>("ON_TIME_RATE");
  const [unit, setUnit] = useState("");
  const [start, setStart] = useState("");
  const [goal, setGoal] = useState("");

  const initial = target?.initial ?? null;

  useEffect(() => {
    if (!target) return;
    if (initial) {
      setTitle(initial.title);
      setKind(initial.kind);
      const m = initial.metric ?? "ON_TIME_RATE";
      setMetric(m);
      setUnit(initial.unit ?? "");
      setStart(initial.kind === "KPI" ? kpiToField(m, initial.startValue) : String(initial.startValue));
      setGoal(initial.kind === "KPI" ? kpiToField(m, initial.targetValue) : String(initial.targetValue));
      return;
    }
    setTitle("");
    setKind("KPI");
    setMetric("ON_TIME_RATE");
    setUnit("");
    setStart("");
    setGoal("");
  }, [target, initial]);

  function number(text: string) {
    return kind === "KPI" ? kpiFromField(metric, text) : Number(text.replace(",", "."));
  }

  function save() {
    if (!target) return;
    startTransition(async () => {
      const payload = {
        title,
        kind,
        metric: kind === "KPI" ? metric : null,
        unit: kind === "MANUAL" ? unit : null,
        startValue: number(start),
        targetValue: number(goal),
      };
      const result = initial
        ? await updateKeyResultAction(initial.id, payload)
        : await addKeyResultAction(target.objectiveId, payload);
      if ("success" in result && result.success) {
        toast.success(initial ? "Resultado-chave atualizado" : "Resultado-chave criado");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível salvar");
    });
  }

  const suffix = kind === "KPI" ? ` (${metricUnitSuffix(metric)})` : unit ? ` (${unit})` : "";

  return (
    <Sheet open={target !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Editar resultado-chave" : "Novo resultado-chave"}</SheetTitle>
          <SheetDescription>
            Um número que mostra se o objetivo foi alcançado: de onde parte e aonde precisa chegar.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="kr-title">Resultado-chave</Label>
            <Input id="kr-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Subir a pontualidade das entregas" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Como acompanhar?</legend>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={kind === "KPI" ? "default" : "outline"} aria-pressed={kind === "KPI"} disabled={Boolean(initial) && initial?.kind !== "KPI"} onClick={() => setKind("KPI")}>
                Automático
              </Button>
              <Button type="button" size="sm" variant={kind === "MANUAL" ? "default" : "outline"} aria-pressed={kind === "MANUAL"} disabled={Boolean(initial) && initial?.kind !== "MANUAL"} onClick={() => setKind("MANUAL")}>
                Manual
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {kind === "KPI"
                ? "O sistema calcula o valor sozinho a partir de um indicador."
                : "Alguém registra o valor por check-in (por exemplo, clientes novos)."}
            </p>
          </fieldset>
          {kind === "KPI" ? (
            <div className="space-y-1">
              <Label htmlFor="kr-metric">Indicador</Label>
              <select id="kr-metric" className={SELECT_CLASS} value={metric} onChange={(e) => setMetric(e.target.value as KpiKey)}>
                {KPI_KEYS.map((k) => (
                  <option key={k} value={k}>{KPI_CATALOG[k].label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="kr-unit">Unidade (opcional)</Label>
              <Input id="kr-unit" value={unit} maxLength={24} onChange={(e) => setUnit(e.target.value)} placeholder="clientes" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kr-start">Parte de{suffix}</Label>
              <Input id="kr-start" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kr-goal">Chega a{suffix}</Label>
              <Input id="kr-goal" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
