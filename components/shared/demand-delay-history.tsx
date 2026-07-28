"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { DELAY_RESOLUTION_LABELS } from "@/lib/services/delay.service";
import type { DemandDelayResolution } from "@prisma/client";

export type DemandDelayRow = {
  id: string;
  originalDueDate: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: DemandDelayResolution | null;
  daysOverdue: number;
};

export function DemandDelayHistory({ delays }: { delays: DemandDelayRow[] }) {
  if (delays.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum registro de atraso para esta demanda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {delays.map((d) => (
        <div
          key={d.id}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              Prazo original:{" "}
              {format(new Date(d.originalDueDate), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </span>
            {d.resolvedAt ? (
              <Badge variant="secondary">
                {d.resolution
                  ? DELAY_RESOLUTION_LABELS[d.resolution]
                  : "Resolvido"}
              </Badge>
            ) : (
              <Badge variant="destructive">Em atraso</Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            Detectado em{" "}
            {format(new Date(d.detectedAt), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })}
            {" · "}
            {d.daysOverdue} dia{d.daysOverdue === 1 ? "" : "s"} de impacto
          </p>
          {d.resolvedAt && (
            <p className="text-muted-foreground">
              Resolvido em{" "}
              {format(new Date(d.resolvedAt), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
