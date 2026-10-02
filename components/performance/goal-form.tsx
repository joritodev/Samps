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
import { createGoalAction, updateGoalAction } from "@/lib/actions/goals.actions";
import {
  DEFAULT_WARN_MARGIN,
  GOAL_SCOPE_LABEL,
  GOAL_SCOPES,
  metricUnitSuffix,
  presetPeriod,
  type GoalScope,
} from "@/lib/agency/goals";
import { KPI_CATALOG, KPI_KEYS, type KpiKey } from "@/lib/agency/performance-summary";
import { dayKey } from "@/lib/agency/sp-calendar";
import type { GoalView } from "@/lib/services/goals.service";

type Option = { id: string; name: string };

const SELECT_CLASS =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Valor no formulário: percentual em 0–100, o resto como está. */
function toField(metric: KpiKey, target: number) {
  const value = KPI_CATALOG[metric].unit === "percent" ? target * 100 : target;
  return String(Math.round(value * 100) / 100);
}

function fromField(metric: KpiKey, text: string) {
  const value = Number(text.replace(",", "."));
  return KPI_CATALOG[metric].unit === "percent" ? value / 100 : value;
}

export function GoalForm({
  open,
  onOpenChange,
  initial,
  sectors,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GoalView | null;
  sectors: Option[];
  people: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [metric, setMetric] = useState<KpiKey>("ON_TIME_RATE");
  const [scope, setScope] = useState<GoalScope>("AGENCY");
  const [sectorId, setSectorId] = useState("");
  const [userId, setUserId] = useState("");
  const [target, setTarget] = useState("");
  const [margin, setMargin] = useState(String(DEFAULT_WARN_MARGIN * 100));
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setMetric(initial.metric);
      setScope(initial.scope);
      setSectorId(initial.sectorId ?? "");
      setUserId(initial.userId ?? "");
      setTarget(toField(initial.metric, initial.target));
      setMargin(String(Math.round(initial.warnMargin * 100)));
      setStartsOn(dayKey(new Date(initial.startsOn)));
      setEndsOn(dayKey(new Date(initial.endsOn)));
      setNote(initial.note ?? "");
      return;
    }
    const quarter = presetPeriod("quarter");
    setMetric("ON_TIME_RATE");
    setScope("AGENCY");
    setSectorId("");
    setUserId("");
    setTarget("");
    setMargin(String(DEFAULT_WARN_MARGIN * 100));
    setStartsOn(quarter.startsOn);
    setEndsOn(quarter.endsOn);
    setNote("");
  }, [open, initial]);

  function applyPreset(preset: "month" | "quarter") {
    const period = presetPeriod(preset);
    setStartsOn(period.startsOn);
    setEndsOn(period.endsOn);
  }

  function save() {
    startTransition(async () => {
      const payload = {
        metric,
        scope,
        sectorId: scope === "SECTOR" ? sectorId : null,
        userId: scope === "USER" ? userId : null,
        target: fromField(metric, target),
        warnMargin: Number(margin.replace(",", ".")) / 100,
        startsOn,
        endsOn,
        note,
      };
      const result = initial
        ? await updateGoalAction(initial.id, payload)
        : await createGoalAction(payload);
      if ("success" in result && result.success) {
        toast.success(initial ? "Meta atualizada" : "Meta criada");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível salvar");
    });
  }

  const meta = KPI_CATALOG[metric];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Editar meta" : "Nova meta"}</SheetTitle>
          <SheetDescription>
            Escolha o indicador, para quem vale, o valor e o período. O sistema
            acompanha sozinho.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="goal-metric">Indicador</Label>
            <select
              id="goal-metric"
              className={SELECT_CLASS}
              value={metric}
              onChange={(e) => setMetric(e.target.value as KpiKey)}
            >
              {KPI_KEYS.map((key) => (
                <option key={key} value={key}>
                  {KPI_CATALOG[key].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {meta.direction === "higher" ? "Quanto maior, melhor." : "Quanto menor, melhor."}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal-scope">Para quem</Label>
            <select
              id="goal-scope"
              className={SELECT_CLASS}
              value={scope}
              onChange={(e) => setScope(e.target.value as GoalScope)}
            >
              {GOAL_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {GOAL_SCOPE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {scope === "SECTOR" ? (
            <div className="space-y-1">
              <Label htmlFor="goal-sector">Setor</Label>
              <select
                id="goal-sector"
                className={SELECT_CLASS}
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
              >
                <option value="">Escolha o setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {scope === "USER" ? (
            <div className="space-y-1">
              <Label htmlFor="goal-user">Pessoa</Label>
              <select
                id="goal-user"
                className={SELECT_CLASS}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">Escolha a pessoa</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="goal-target">Valor da meta ({metricUnitSuffix(metric)})</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={meta.unit === "percent" ? "85" : "0"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-margin">Alerta amarelo (%)</Label>
              <Input
                id="goal-margin"
                inputMode="decimal"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Fica amarelo quando o valor está até essa margem do alvo.
          </p>

          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>
                Mês atual
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("quarter")}>
                Trimestre atual
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="goal-from" className="text-xs text-muted-foreground">De</Label>
                <Input id="goal-from" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-to" className="text-xs text-muted-foreground">Até</Label>
                <Input id="goal-to" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal-note">Observação (opcional)</Label>
            <Input
              id="goal-note"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por que esta meta existe"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Salvando…" : "Salvar meta"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
