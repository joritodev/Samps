"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESIGN_TIME_DEFAULTS, designMinutes } from "@/lib/agency/planning/config";
import { computeDesignTime } from "@/lib/agency/planning/design-calc";
import { formatHours } from "@/lib/agency/planning/week";

export function DesignCalculator({
  kind,
  presets,
  onApply,
}: {
  kind: string;
  presets: { label: string; hours: number }[];
  onApply: (hours: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [noIdentity, setNoIdentity] = useState(false);
  const [newTemplate, setNewTemplate] = useState(false);
  const result = computeDesignTime({ kind, quantity, noIdentity, newTemplate }, presets);
  if (!result) return null;
  const extraIdentity = designMinutes("sem_identidade", presets) ?? 90;
  const extraTemplate = designMinutes("template_video", presets) ?? 20;
  const unit = DESIGN_TIME_DEFAULTS.find((d) => d.key === kind)?.unit;

  return (
    <div className="space-y-2 rounded-md border border-primary/25 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Calculadora de tempo</p>
      <div className="flex flex-wrap items-end gap-3">
        {unit && (
          <div className="w-28 space-y-1">
            <Label htmlFor="calc-qty" className="text-xs">
              Quantidade ({unit})
            </Label>
            <Input
              id="calc-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={noIdentity} onChange={(e) => setNoIdentity(e.target.checked)} />
          Sem identidade visual (+{formatHours(extraIdentity / 60)})
        </label>
        {kind === "video_template" && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={newTemplate} onChange={(e) => setNewTemplate(e.target.checked)} />
            Criar template novo (+{formatHours(extraTemplate / 60)})
          </label>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-foreground/80">
          {result.summary} = <strong>{formatHours(result.totalMinutes / 60)}</strong>
        </p>
        <Button type="button" size="sm" onClick={() => onApply(result.hours)}>
          Usar este tempo
        </Button>
      </div>
    </div>
  );
}
