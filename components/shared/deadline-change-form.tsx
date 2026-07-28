"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeDemandDeadlineAction } from "@/lib/actions/deadline.actions";
import type { DeadlineField } from "@/lib/services/deadline.service";
import { toast } from "sonner";

function toDateInputValue(d?: Date | string | null) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

export function DeadlineChangeForm({
  demandId,
  clientId,
  dueDate,
  demandDeadline,
  publishDate,
}: {
  demandId: string;
  clientId: string;
  dueDate?: Date | string | null;
  demandDeadline?: Date | string | null;
  publishDate?: Date | string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [justification, setJustification] = useState("");
  const [values, setValues] = useState({
    dueDate: toDateInputValue(dueDate),
    demandDeadline: toDateInputValue(demandDeadline),
    publishDate: toDateInputValue(publishDate),
  });

  const fields: { key: DeadlineField; label: string }[] = [
    { key: "dueDate", label: "Prazo interno (dueDate)" },
    { key: "demandDeadline", label: "Prazo do setor" },
    { key: "publishDate", label: "Data de publicação" },
  ];

  function save(field: DeadlineField) {
    const newDate = values[field];
    if (!newDate) {
      toast.error("Informe a nova data");
      return;
    }
    if (justification.trim().length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }
    startTransition(async () => {
      const r = await changeDemandDeadlineAction({
        demandId,
        clientId,
        field,
        newDate,
        justification,
      });
      if ("success" in r && r.success) {
        toast.success("Prazo atualizado");
        setJustification("");
      } else {
        toast.error("error" in r ? r.error : "Erro ao salvar");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Alterar prazo (gestão)</p>
      {fields.map(({ key, label }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || !values[key]}
              onClick={() => save(key)}
            >
              Salvar
            </Button>
          </div>
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">Justificativa *</Label>
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Motivo da alteração de prazo..."
          rows={3}
          className="text-sm"
        />
      </div>
    </div>
  );
}
