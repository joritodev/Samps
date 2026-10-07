"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, CheckCheck, ClipboardPen, Pencil, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CheckInSheet } from "@/components/performance/check-in-sheet";
import { ConfidenceBar, ConfidenceChip } from "@/components/performance/confidence-chip";
import { KeyResultForm, type KeyResultTarget } from "@/components/performance/key-result-form";
import { KeyResultRow } from "@/components/performance/key-result-row";
import { ObjectiveForm } from "@/components/performance/objective-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteKeyResultAction,
  deleteObjectiveAction,
  duplicateObjectiveAction,
  setObjectiveStatusAction,
} from "@/lib/actions/okr.actions";
import { GOAL_SCOPE_LABEL } from "@/lib/agency/goals";
import { OBJECTIVE_STATUS_LABEL, type ObjectiveStatus } from "@/lib/agency/okr";
import { formatProgress } from "@/lib/agency/okr-format";
import { shortDay } from "@/lib/agency/performance-format";
import { dayKey } from "@/lib/agency/sp-calendar";
import type { KeyResultView, ObjectiveView } from "@/lib/services/okr.service";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

const PERIODS = [
  { value: "atual", label: "Trimestre atual" },
  { value: "anterior", label: "Trimestre anterior" },
  { value: "todos", label: "Todos" },
] as const;

export function objectiveSubject(o: Pick<ObjectiveView, "scope" | "sectorName" | "userName">) {
  if (o.scope === "SECTOR") return o.sectorName ?? "Setor";
  if (o.scope === "USER") return o.userName ?? "Pessoa";
  return GOAL_SCOPE_LABEL.AGENCY;
}

function buildTree(list: ObjectiveView[]) {
  const ids = new Set(list.map((o) => o.id));
  const children = new Map<string, ObjectiveView[]>();
  const roots: ObjectiveView[] = [];
  for (const o of list) {
    if (o.parentId && ids.has(o.parentId)) {
      children.set(o.parentId, [...(children.get(o.parentId) ?? []), o]);
    } else {
      roots.push(o);
    }
  }
  return { roots, children };
}

function ObjectiveCard({
  objective,
  canManage,
  onEdit,
  onAddKr,
  onEditKr,
  onCheckIn,
}: {
  objective: ObjectiveView;
  canManage: boolean;
  onEdit: (o: ObjectiveView) => void;
  onAddKr: (target: KeyResultTarget) => void;
  onEditKr: (target: KeyResultTarget) => void;
  onCheckIn: (kr: KeyResultView) => void;
}) {
  const [pending, startTransition] = useTransition();

  function act(work: () => Promise<{ success: true } | { error: string }>, done: string) {
    startTransition(async () => {
      const result = await work();
      if ("error" in result) toast.error(result.error);
      else toast.success(done);
    });
  }

  function setStatus(status: ObjectiveStatus, done: string) {
    act(() => setObjectiveStatusAction(objective.id, status), done);
  }

  const closed = objective.status !== "ACTIVE";

  return (
    <article className={cn("rounded-xl border border-border/80 bg-card p-4 shadow-xs", closed && "opacity-80")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{objective.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {objectiveSubject(objective)} · {shortDay(dayKey(new Date(objective.startsOn)))} a{" "}
            {shortDay(dayKey(new Date(objective.endsOn)))} · dono: {objective.ownerName}
          </p>
          {objective.description ? <p className="mt-1.5 text-sm text-muted-foreground">{objective.description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="num text-xl font-semibold leading-none text-foreground">{formatProgress(objective.progress)}</p>
          {closed ? <Badge variant="outline">{OBJECTIVE_STATUS_LABEL[objective.status]}</Badge> : <ConfidenceChip confidence={objective.confidence} />}
        </div>
      </header>
      <div className="mt-3">
        <ConfidenceBar confidence={objective.confidence} progress={objective.progress} />
      </div>

      {objective.keyResults.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Sem resultados-chave ainda.{canManage ? " Adicione ao menos um para medir o objetivo." : ""}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {objective.keyResults.map((kr) => (
            <KeyResultRow
              key={kr.id}
              kr={kr}
              actions={
                <>
                  {kr.kind === "MANUAL" && objective.canCheckIn && !closed ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => onCheckIn(kr)}>
                      <ClipboardPen />
                      Check-in
                    </Button>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${kr.title}`} onClick={() => onEditKr({ objectiveId: objective.id, initial: kr })} disabled={pending}>
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Apagar ${kr.title}`}
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm("Apagar este resultado-chave e seus check-ins?")) {
                            act(() => deleteKeyResultAction(kr.id), "Resultado-chave apagado");
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  ) : null}
                </>
              }
            />
          ))}
        </ul>
      )}

      {canManage ? (
        <footer className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onAddKr({ objectiveId: objective.id, initial: null })} disabled={pending}>
            <Plus />
            Resultado-chave
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(objective)} disabled={pending}>
            <Pencil />
            Editar
          </Button>
          {objective.status === "ACTIVE" ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("DONE", "Objetivo concluído")} disabled={pending}>
                <CheckCheck />
                Concluir
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("CANCELLED", "Objetivo cancelado")} disabled={pending}>
                <XCircle />
                Cancelar
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("ACTIVE", "Objetivo reaberto")} disabled={pending}>
              <RotateCcw />
              Reabrir
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => act(() => duplicateObjectiveAction(objective.id), "Objetivo copiado para o próximo período")} disabled={pending}>
            <CalendarPlus />
            Copiar para o próximo período
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Apagar este objetivo, os resultados-chave e os check-ins? Isso não pode ser desfeito.")) {
                act(() => deleteObjectiveAction(objective.id), "Objetivo apagado");
              }
            }}
          >
            <Trash2 />
            Apagar
          </Button>
        </footer>
      ) : null}
    </article>
  );
}

export function OkrBoard({
  objectives,
  period,
  canManage,
  sectors,
  people,
  currentUserId,
}: {
  objectives: ObjectiveView[];
  period: string;
  canManage: boolean;
  sectors: Option[];
  people: Option[];
  currentUserId: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ObjectiveView | null>(null);
  const [krTarget, setKrTarget] = useState<KeyResultTarget | null>(null);
  const [checkIn, setCheckIn] = useState<KeyResultView | null>(null);
  const { roots, children } = buildTree(objectives);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function renderNode(o: ObjectiveView, depth: number): React.ReactNode {
    return (
      <li key={o.id} className={cn(depth > 0 && "border-l-2 border-border/70 pl-4")}>
        <ObjectiveCard
          objective={o}
          canManage={canManage}
          onEdit={(obj) => {
            setEditing(obj);
            setFormOpen(true);
          }}
          onAddKr={setKrTarget}
          onEditKr={setKrTarget}
          onCheckIn={setCheckIn}
        />
        {(children.get(o.id) ?? []).length > 0 ? (
          <ul className="mt-3 space-y-3">{(children.get(o.id) ?? []).map((c) => renderNode(c, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Período dos objetivos" className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={p.value === "atual" ? "/performance/okrs" : `/performance/okrs?periodo=${p.value}`}
              aria-current={period === p.value ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        {canManage ? (
          <Button type="button" size="sm" onClick={openNew}>
            <Plus />
            Novo objetivo
          </Button>
        ) : null}
      </div>

      {roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhum objetivo neste período</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {canManage
              ? "Um objetivo diz onde chegar no trimestre. Cada um ganha de 2 a 4 resultados-chave que mostram se está dando certo."
              : "Quando a gestão definir objetivos para a agência, o setor ou você, eles aparecem aqui."}
          </p>
          {canManage ? (
            <Button type="button" size="sm" className="mt-4" onClick={openNew}>
              <Plus />
              Novo objetivo
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">{roots.map((o) => renderNode(o, 0))}</ul>
      )}

      {canManage ? (
        <>
          <ObjectiveForm
            open={formOpen}
            onOpenChange={setFormOpen}
            initial={editing}
            sectors={sectors}
            people={people}
            parents={objectives}
            defaultOwnerId={currentUserId}
          />
          <KeyResultForm target={krTarget} onOpenChange={(open) => !open && setKrTarget(null)} />
        </>
      ) : null}
      <CheckInSheet keyResult={checkIn} onOpenChange={(open) => !open && setCheckIn(null)} />
    </div>
  );
}
