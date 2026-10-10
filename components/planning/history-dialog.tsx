"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listPlanningHistoryAction } from "@/lib/actions/planning.actions";
import type { IsoWeek } from "@/lib/agency/planning/types";
import { weekRangeLabel } from "@/lib/agency/planning/week";
import type { PlanningHistoryEntry } from "@/lib/services/planning-cards.service";

export function HistoryDialog({
  slug,
  week,
  onClose,
}: {
  slug: string;
  week: IsoWeek;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<PlanningHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPlanningHistoryAction(slug, week).then((result) => {
      if (cancelled) return;
      if ("entries" in result) setEntries(result.entries);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, week]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Histórico — {weekRangeLabel(week)}</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : entries === null ? (
          <p className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma alteração registrada nesta semana.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border p-2 text-sm">
                <p className="text-foreground">{entry.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.actorName ?? "Sistema"} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
