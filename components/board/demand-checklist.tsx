"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  addChecklistItemAction,
  assignChecklistItemAction,
  completeChecklistItemAction,
  createChecklistAction,
  setChecklistItemDueDateAction,
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
import { Textarea } from "@/components/ui/textarea";

export type ChecklistAssigneeOption = {
  id: string;
  name: string;
  sectorId: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  description?: string | null;
  format?: string | null;
  status: string;
  checklistOrder?: number | null;
  dueDate?: Date | string | null;
  assignee?: { id?: string; name: string } | null;
};

function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function DemandChecklist({
  parentId,
  clientId,
  items: initialItems,
  assignees = [],
  canEdit = false,
  defaultDueDate = null,
  onOpenItem,
}: {
  parentId: string;
  clientId: string;
  items: ChecklistItem[];
  assignees?: ChecklistAssigneeOption[];
  canEdit?: boolean;
  defaultDueDate?: Date | string | null;
  onOpenItem?: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("");
  const [dueDate, setDueDate] = useState(toDateInputValue(defaultDueDate));
  const [assigneeId, setAssigneeId] = useState("");
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  /** Task 5: props passam checklists[].id; até lá cria/reusa na sessão. */
  const [checklistId, setChecklistId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setChecklistId(null);
  }, [initialItems, parentId]);

  useEffect(() => {
    setDueDate(toDateInputValue(defaultDueDate));
  }, [defaultDueDate, parentId]);

  const progress = useMemo(
    () =>
      computeChecklistProgress(
        items.map((item) => ({
          isDone:
            item.status === "DONE" ||
            item.status === "PUBLISHED" ||
            item.status === "DELIVERED",
        }))
      ),
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
      toast.error("Informe o título da demanda.");
      return;
    }

    startTransition(async () => {
      let activeChecklistId = checklistId;
      if (!activeChecklistId) {
        const created = await createChecklistAction({
          demandId: parentId,
          clientId,
          title: "Checklist",
        });
        if (!("success" in created) || !created.success) {
          toast.error(
            "error" in created
              ? created.error
              : "Não foi possível criar o checklist."
          );
          return;
        }
        activeChecklistId = created.checklist.id;
        setChecklistId(activeChecklistId);
      }

      const result = await addChecklistItemAction({
        checklistId: activeChecklistId,
        clientId,
        title: title.trim(),
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível adicionar o item."
        );
        return;
      }

      let item = result.item;
      if (dueDate) {
        const due = await setChecklistItemDueDateAction({
          itemId: item.id,
          clientId,
          dueDate,
        });
        if (!("success" in due) || !due.success) {
          toast.error(
            "error" in due ? due.error : "Não foi possível atualizar o prazo."
          );
          return;
        }
        item = due.item;
      }
      if (assigneeId) {
        const assigned = await assignChecklistItemAction({
          itemId: item.id,
          clientId,
          assigneeId,
        });
        if (!("success" in assigned) || !assigned.success) {
          toast.error(
            "error" in assigned
              ? assigned.error
              : "Não foi possível atribuir o item."
          );
          return;
        }
        item = assigned.item;
      }

      const assigneeName =
        sortedAssignees.find((a) => a.id === (item.assigneeId ?? assigneeId))
          ?.name ?? null;

      toast.success(
        assigneeId
          ? "Item enviado ao setor em Disponíveis."
          : "Item adicionado ao checklist."
      );
      setTitle("");
      setDescription("");
      setFormat("");
      setDueDate(toDateInputValue(defaultDueDate));
      setAssigneeId("");
      refreshFromServer([
        ...items,
        {
          id: item.id,
          title: item.title,
          description: description.trim() || null,
          format: format.trim() || null,
          status: item.isDone ? "DONE" : "OPEN",
          checklistOrder: item.sortOrder,
          dueDate: item.dueDate,
          assignee: item.assigneeId
            ? { id: item.assigneeId, name: assigneeName ?? "" }
            : null,
        },
      ]);
    });
  }

  function handleComplete(childId: string) {
    startTransition(async () => {
      const result = await completeChecklistItemAction({ childId, clientId });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível concluir o item."
        );
        return;
      }
      toast.success("Demanda do checklist concluída.");
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

      <p className="text-xs text-muted-foreground">
        Cada item vira uma demanda de verdade. Com responsável, cai em
        Disponíveis no Meu painel do setor — a pessoa assume para ir à
        Produção. Concluir no checklist também conclui a demanda.
      </p>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum item ainda. Preencha título, descrição e, se quiser, o
          responsável.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const done =
              item.status === "DONE" ||
              item.status === "PUBLISHED" ||
              item.status === "DELIVERED";
            const dueLabel = item.dueDate
              ? formatDate(new Date(item.dueDate), "dd/MM", { locale: ptBR })
              : null;
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
                  {item.description ? (
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {demandStatusLabel(item.status)}
                    </Badge>
                    {item.format ? (
                      <Badge variant="secondary" className="text-xs">
                        {item.format}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {item.assignee?.name ?? "Sem responsável"}
                    </span>
                    {dueLabel ? (
                      <span className="text-xs text-muted-foreground">
                        Prazo: {dueLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {onOpenItem ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => onOpenItem(item.id)}
                    >
                      Abrir
                    </Button>
                  ) : null}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label htmlFor={`checklist-title-${parentId}`}>Título</Label>
            <Input
              id={`checklist-title-${parentId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Criar conjunto de anúncios"
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`checklist-desc-${parentId}`}>Descrição</Label>
            <Textarea
              id={`checklist-desc-${parentId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefing do item: objetivo, referências, o que precisa ficar pronto…"
              rows={3}
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`checklist-format-${parentId}`}>Formato</Label>
              <Input
                id={`checklist-format-${parentId}`}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Feed, Stories, Reels…"
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`checklist-due-${parentId}`}>Prazo</Label>
              <Input
                id={`checklist-due-${parentId}`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Responsável (demandar ao setor)</Label>
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
            {assigneeId ? "Demandar ao setor" : "Adicionar demanda"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
