"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addChecklistItemAction,
  completeChecklistItemAction,
} from "@/app/actions/checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { demandStatusLabel } from "@/lib/agency/labels";
import { computeChecklistProgress } from "@/lib/agency/checklist-progress";

export type ChecklistAssigneeOption = {
  id: string;
  name: string;
  sectorId: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  status: string;
  checklistOrder?: number | null;
  assignee?: { id?: string; name: string } | null;
};

export function DemandChecklist({
  parentId,
  clientId,
  items: initialItems,
  assignees = [],
  canEdit = false,
}: {
  parentId: string;
  clientId: string;
  items: ChecklistItem[];
  assignees?: ChecklistAssigneeOption[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems, parentId]);

  const progress = useMemo(
    () => computeChecklistProgress(items),
    [items]
  );

  const sortedAssignees = useMemo(
    () => [...assignees].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [assignees]
  );

  function refreshFromServer(next: ChecklistItem[]) {
    setItems(next);
    router.refresh();
  }

  function handleAdd() {
    if (!title.trim()) {
      toast.error("Informe o título do item.");
      return;
    }

    startTransition(async () => {
      const selected = sortedAssignees.find((a) => a.id === assigneeId);
      const result = await addChecklistItemAction({
        parentId,
        clientId,
        title,
        assigneeId: assigneeId || undefined,
        sectorId: selected?.sectorId,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Item adicionado ao checklist.");
      setTitle("");
      setAssigneeId("");
      if (result.child) {
        refreshFromServer([
          ...items,
          {
            id: result.child.id,
            title: result.child.title,
            status: result.child.status,
            checklistOrder: result.child.checklistOrder,
            assignee: result.child.assignee,
          },
        ]);
      } else {
        router.refresh();
      }
    });
  }

  function handleComplete(childId: string) {
    startTransition(async () => {
      const result = await completeChecklistItemAction({ childId, clientId });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Item concluído.");
      refreshFromServer(
        items.map((item) =>
          item.id === childId
            ? {
                ...item,
                status:
                  result.child && "status" in result.child
                    ? String(result.child.status)
                    : "DONE",
              }
            : item
        )
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Checklist</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {progress.done}/{progress.total}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum item ainda. Adicione tarefas com responsáveis diferentes.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const done =
              item.status === "DONE" ||
              item.status === "PUBLISHED" ||
              item.status === "DELIVERED";
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0 space-y-1">
                  <p
                    className={
                      done
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm text-foreground"
                    }
                  >
                    {item.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {demandStatusLabel(item.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.assignee?.name ?? "Sem responsável"}
                    </span>
                  </div>
                </div>
                {!done && canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => handleComplete(item.id)}
                  >
                    Concluir
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label htmlFor={`checklist-title-${parentId}`}>Novo item</Label>
            <Input
              id={`checklist-title-${parentId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Revisar copy"
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label>Responsável (opcional)</Label>
            <Select
              value={assigneeId || "__none__"}
              onValueChange={(v) => setAssigneeId(v === "__none__" ? "" : v)}
              disabled={pending || sortedAssignees.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {sortedAssignees.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={handleAdd}
            className="w-full sm:w-auto"
          >
            Adicionar item
          </Button>
        </div>
      ) : null}
    </div>
  );
}
