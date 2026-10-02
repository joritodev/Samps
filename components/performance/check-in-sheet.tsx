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
import { addCheckInAction } from "@/lib/actions/okr.actions";
import { CONFIDENCE_LABEL, CONFIDENCES, type Confidence } from "@/lib/agency/okr";
import { formatKrRange } from "@/lib/agency/okr-format";
import type { KeyResultView } from "@/lib/services/okr.service";

export function CheckInSheet({
  keyResult,
  onOpenChange,
}: {
  keyResult: KeyResultView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("ON_TRACK");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!keyResult) return;
    setValue(keyResult.current === null ? "" : String(keyResult.current));
    setConfidence(keyResult.history[0]?.confidence ?? "ON_TRACK");
    setNote("");
  }, [keyResult]);

  function save() {
    if (!keyResult) return;
    startTransition(async () => {
      const result = await addCheckInAction(keyResult.id, {
        value: Number(value.replace(",", ".")),
        confidence,
        note,
      });
      if ("success" in result && result.success) {
        toast.success("Check-in registrado");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível registrar");
    });
  }

  return (
    <Sheet open={keyResult !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Check-in</SheetTitle>
          <SheetDescription>
            {keyResult ? `${keyResult.title} · ${formatKrRange(keyResult)}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ci-value">Valor atual{keyResult?.unit ? ` (${keyResult.unit})` : ""}</Label>
            <Input id="ci-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Como está o andamento?</legend>
            <div className="flex flex-wrap gap-2">
              {CONFIDENCES.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={confidence === c ? "default" : "outline"}
                  aria-pressed={confidence === c}
                  onClick={() => setConfidence(c)}
                >
                  {CONFIDENCE_LABEL[c]}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="ci-note">Nota (opcional)</Label>
            <Input
              id="ci-note"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que mudou desde o último check-in"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Salvando…" : "Registrar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
