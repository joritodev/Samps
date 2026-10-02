"use client";

import { useState, useTransition } from "react";
import { Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GoalReading, goalSubject } from "@/components/performance/goal-row";
import { GoalForm } from "@/components/performance/goal-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteGoalAction, setGoalActiveAction } from "@/lib/actions/goals.actions";
import { GOAL_SCOPE_LABEL, GOAL_SCOPES, type GoalScope } from "@/lib/agency/goals";
import { KPI_CATALOG } from "@/lib/agency/performance-summary";
import type { GoalView } from "@/lib/services/goals.service";

type Option = { id: string; name: string };

const SECTION_TITLE: Record<GoalScope, string> = {
  AGENCY: "Agência",
  SECTOR: "Setores",
  USER: "Pessoas",
};

function GoalCard({
  goal,
  canManage,
  onEdit,
}: {
  goal: GoalView;
  canManage: boolean;
  onEdit: (goal: GoalView) => void;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setGoalActiveAction(goal.id, !goal.active);
      if ("error" in result) toast.error(result.error);
      else toast.success(goal.active ? "Meta pausada" : "Meta reativada");
    });
  }

  function remove() {
    if (!window.confirm("Apagar esta meta? Isso não pode ser desfeito.")) return;
    startTransition(async () => {
      const result = await deleteGoalAction(goal.id);
      if ("error" in result) toast.error(result.error);
      else toast.success("Meta apagada");
    });
  }

  return (
    <li className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <GoalReading goal={goal} showSubject={goal.scope !== "AGENCY"} />
          {goal.note ? <p className="mt-2 text-xs text-muted-foreground">{goal.note}</p> : null}
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button type="button" variant="ghost" size="icon" aria-label={`Editar meta de ${KPI_CATALOG[goal.metric].label} (${goalSubject(goal)})`} onClick={() => onEdit(goal)} disabled={pending}>
              <Pencil />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={goal.active ? "Pausar meta" : "Reativar meta"} onClick={toggle} disabled={pending}>
              {goal.active ? <Pause /> : <Play />}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Apagar meta" onClick={remove} disabled={pending}>
              <Trash2 />
            </Button>
          </div>
        ) : null}
      </div>
      {!goal.active ? (
        <Badge variant="outline" className="mt-2">Pausada</Badge>
      ) : null}
    </li>
  );
}

export function GoalsBoard({
  goals,
  canManage,
  sectors,
  people,
}: {
  goals: GoalView[];
  canManage: boolean;
  sectors: Option[];
  people: Option[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalView | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  const running = goals.filter((g) => g.state !== "ended");
  const ended = goals.filter((g) => g.state === "ended");
  const visible = showEnded ? goals : running;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(goal: GoalView) {
    setEditing(goal);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Metas dão régua aos indicadores: o sistema calcula o valor atual e
          mostra se está no caminho.
        </p>
        <div className="flex items-center gap-2">
          {ended.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowEnded((v) => !v)}>
              {showEnded ? "Esconder encerradas" : `Ver encerradas (${ended.length})`}
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" size="sm" onClick={openNew}>
              <Plus />
              Nova meta
            </Button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhuma meta em andamento</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {canManage
              ? "Crie a primeira meta, por exemplo “No prazo ≥ 85% no trimestre”."
              : "Quando a gestão definir metas para você, o setor ou a agência, elas aparecem aqui."}
          </p>
          {canManage ? (
            <Button type="button" size="sm" className="mt-4" onClick={openNew}>
              <Plus />
              Nova meta
            </Button>
          ) : null}
        </div>
      ) : (
        GOAL_SCOPES.map((scope) => {
          const items = visible.filter((g) => g.scope === scope);
          if (items.length === 0) return null;
          return (
            <section key={scope} aria-label={GOAL_SCOPE_LABEL[scope]} className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">{SECTION_TITLE[scope]}</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} canManage={canManage} onEdit={openEdit} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {canManage ? (
        <GoalForm
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          sectors={sectors}
          people={people}
        />
      ) : null}
    </div>
  );
}
