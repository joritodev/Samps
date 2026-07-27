"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  claimDemandAction,
  assignDemandAction,
  setScheduledExecutionAction,
} from "@/lib/actions/assignment.actions";
import {
  startWorkSessionAction,
  pauseWorkSessionAction,
  resumeWorkSessionAction,
  completeProductionSectorAction,
} from "@/lib/actions/work-session.actions";
import { requestAdjustmentAction } from "@/lib/actions/adjustment.actions";
import { PAUSE_REASONS } from "@/lib/constants/work-session";
import { toast } from "sonner";

export type SectorCardDetail = {
  id: string;
  title: string;
  description?: string | null;
  format?: string | null;
  status: string;
  clientId: string;
  materialUrl?: string | null;
  scheduledExecutionAt?: Date | null;
  demandDeadline?: Date | null;
  dueDate?: Date | null;
  client?: { name: string };
  assignee?: { id: string; name: string } | null;
  assignments?: {
    status: string;
    executorId?: string | null;
    executor?: { id: string; name: string } | null;
  }[];
  workSessions?: {
    id: string;
    status: string;
    userId: string;
  }[];
};

export function SectorCardSheet({
  card,
  open,
  onOpenChange,
  currentUserId,
  canAssign,
  sectorUsers,
}: {
  card: SectorCardDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  canAssign: boolean;
  sectorUsers: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [materialUrl, setMaterialUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pauseReason, setPauseReason] = useState<string>(PAUSE_REASONS[0]);
  const [pauseDesc, setPauseDesc] = useState("");
  const [assignTo, setAssignTo] = useState("");

  useEffect(() => {
    if (card && open) {
      setMaterialUrl(card.materialUrl ?? "");
      setScheduledAt(
        card.scheduledExecutionAt
          ? new Date(card.scheduledExecutionAt).toISOString().slice(0, 16)
          : ""
      );
      setAssignTo(sectorUsers[0]?.id ?? "");
    }
  }, [card, open, sectorUsers]);

  if (!card) return null;

  const assignment = card.assignments?.[0];
  const session = card.workSessions?.[0];
  const isExecutor = assignment?.executorId === currentUserId || card.assignee?.id === currentUserId;
  const isAvailable = !assignment?.executorId && (assignment?.status === "AVAILABLE" || !assignment);

  function run(fn: () => Promise<{ success?: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else toast.success(ok);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">{card.title}</SheetTitle>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{card.status}</Badge>
            {card.format && <Badge variant="secondary">{card.format}</Badge>}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <p><strong>Cliente:</strong> {card.client?.name}</p>
          <p><strong>Executor:</strong> {assignment?.executor?.name ?? card.assignee?.name ?? "—"}</p>
          {card.description && (
            <p className="text-slate-600 whitespace-pre-wrap">{card.description}</p>
          )}

          {isAvailable && (
            <Button
              disabled={pending}
              onClick={() =>
                run(() => claimDemandAction(card.id, card.clientId), "Demanda assumida")
              }
            >
              Assumir demanda
            </Button>
          )}

          {canAssign && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Atribuir a</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                {sectorUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !assignTo}
                onClick={() =>
                  run(
                    () => assignDemandAction(card.id, card.clientId, assignTo),
                    "Demanda atribuída"
                  )
                }
              >
                Atribuir
              </Button>
            </div>
          )}

          {isExecutor && (
            <>
              <div className="space-y-2">
                <Label>Data programada de execução</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || !scheduledAt}
                  onClick={() =>
                    run(
                      () =>
                        setScheduledExecutionAction(
                          card.id,
                          card.clientId,
                          new Date(scheduledAt).toISOString()
                        ),
                      "Data programada"
                    )
                  }
                >
                  Salvar data
                </Button>
              </div>

              {!session && (
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => startWorkSessionAction(card.id, card.clientId),
                      "Produção iniciada"
                    )
                  }
                >
                  Iniciar produção
                </Button>
              )}

              {session?.status === "ACTIVE" && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Pausar</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                  >
                    {PAUSE_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {pauseReason === "Outro" && (
                    <Textarea
                      value={pauseDesc}
                      onChange={(e) => setPauseDesc(e.target.value)}
                      placeholder="Justificativa"
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          pauseWorkSessionAction(
                            session.id,
                            card.clientId,
                            pauseReason,
                            pauseDesc
                          ),
                        "Pausada"
                      )
                    }
                  >
                    Pausar
                  </Button>
                </div>
              )}

              {session?.status === "PAUSED" && (
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => resumeWorkSessionAction(session.id, card.clientId),
                      "Retomada"
                    )
                  }
                >
                  Retomar
                </Button>
              )}

              {(session || assignment?.status === "IN_PROGRESS") && (
                <div className="space-y-2">
                  <Label>Link do material</Label>
                  <Input
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    disabled={pending || !materialUrl.trim()}
                    onClick={() =>
                      run(
                        () =>
                          completeProductionSectorAction(
                            card.id,
                            card.clientId,
                            materialUrl
                          ),
                        "Enviado para revisão"
                      )
                    }
                  >
                    Concluir produção e enviar para revisão
                  </Button>
                </div>
              )}
            </>
          )}

          {(card.status === "IN_REVIEW" || assignment?.status === "IN_REVIEW") && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Label>Solicitar ajuste</Label>
              <Textarea
                value={pauseDesc}
                onChange={(e) => setPauseDesc(e.target.value)}
                placeholder="Descreva o ajuste necessário"
                rows={3}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !pauseDesc.trim()}
                onClick={() =>
                  run(
                    () =>
                      requestAdjustmentAction(card.id, card.clientId, pauseDesc),
                    "Ajuste solicitado"
                  )
                }
              >
                Solicitar ajuste
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
