"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  changeDemandDeadlineAction,
  listDemandHistoryAction,
  updateDemandDescriptionAction,
} from "@/lib/actions/deadline.actions";
import type { DemandHistoryEntry } from "@/lib/agency/demand-history";
import type { DeadlineField } from "@/lib/services/deadline.service";

function toDateInputValue(d?: Date | string | null) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

/**
 * Prazo e descrição do card: qualquer pessoa com acesso edita, o motivo é opcional
 * e cada mudança entra na linha do tempo logo abaixo.
 */
export function DemandHistoryPanel({
  demandId,
  clientId,
  description,
  dueDate,
  demandDeadline,
  publishDate,
}: {
  demandId: string;
  clientId: string;
  description?: string | null;
  dueDate?: Date | string | null;
  demandDeadline?: Date | string | null;
  publishDate?: Date | string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [entries, setEntries] = useState<DemandHistoryEntry[] | null>(null);
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState(description ?? "");
  const [dates, setDates] = useState({
    dueDate: toDateInputValue(dueDate),
    demandDeadline: toDateInputValue(demandDeadline),
    publishDate: toDateInputValue(publishDate),
  });

  const load = useCallback(() => {
    listDemandHistoryAction(demandId)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [demandId]);

  useEffect(() => {
    setEntries(null);
    setDraft(description ?? "");
    setReason("");
    setDates({
      dueDate: toDateInputValue(dueDate),
      demandDeadline: toDateInputValue(demandDeadline),
      publishDate: toDateInputValue(publishDate),
    });
    load();
  }, [demandId, description, dueDate, demandDeadline, publishDate, load]);

  const fields: { key: DeadlineField; label: string }[] = [
    { key: "dueDate", label: "Prazo" },
    ...(demandDeadline ? [{ key: "demandDeadline" as const, label: "Prazo do setor" }] : []),
    ...(publishDate ? [{ key: "publishDate" as const, label: "Data de publicação" }] : []),
  ];

  function saveDeadline(field: DeadlineField) {
    const newDate = dates[field];
    if (!newDate) {
      toast.error("Informe a nova data.");
      return;
    }
    startTransition(async () => {
      const result = await changeDemandDeadlineAction({ demandId, clientId, field, newDate, justification: reason });
      if ("success" in result && result.success) {
        toast.success("Prazo atualizado.");
        setReason("");
        load();
      } else {
        toast.error("error" in result ? result.error : "Não foi possível salvar.");
      }
    });
  }

  function saveDescription() {
    startTransition(async () => {
      const result = await updateDemandDescriptionAction({ demandId, clientId, description: draft, reason });
      if ("success" in result && result.success) {
        toast.success("Descrição atualizada.");
        setReason("");
        load();
      } else {
        toast.error("error" in result ? result.error : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="space-y-4" data-testid="demand-history-panel">
      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium text-foreground">Prazo</p>
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs" htmlFor={`history-${key}-${demandId}`}>
              {label}
            </Label>
            <div className="flex gap-2">
              <Input
                id={`history-${key}-${demandId}`}
                type="date"
                value={dates[key]}
                onChange={(e) => setDates((v) => ({ ...v, [key]: e.target.value }))}
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" disabled={pending || !dates[key]} onClick={() => saveDeadline(key)}>
                Salvar
              </Button>
            </div>
          </div>
        ))}

        <p className="pt-1 text-xs font-medium text-foreground">Descrição</p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="text-sm"
          aria-label="Descrição da demanda"
          placeholder="O que precisa ser feito."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || draft.trim() === (description ?? "").trim()}
          onClick={saveDescription}
        >
          Salvar descrição
        </Button>

        <div className="space-y-1 pt-1">
          <Label className="text-xs" htmlFor={`history-reason-${demandId}`}>
            Motivo (opcional)
          </Label>
          <Input
            id={`history-reason-${demandId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: cliente pediu mais tempo"
            maxLength={500}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico do card</p>
        {entries === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mudança de prazo ou descrição ainda.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3 text-sm">
                {e.kind === "deadline" ? (
                  <p className="font-medium text-foreground">
                    {e.label}: {e.from ?? "sem data"} → {e.to ?? "sem data"}
                  </p>
                ) : (
                  <div>
                    <p className="font-medium text-foreground">Descrição alterada</p>
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Ver antes e depois</summary>
                      <p className="mt-1 whitespace-pre-wrap">
                        <span className="font-medium">Antes:</span> {e.from ?? "(vazia)"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        <span className="font-medium">Depois:</span> {e.to ?? "(vazia)"}
                      </p>
                    </details>
                  </div>
                )}
                {e.reason ? <p className="text-xs text-foreground/80">Motivo: {e.reason}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {e.userName ?? "Sistema"} · {new Date(e.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
