"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  addChecklistItemAction,
  assignChecklistItemAction,
  createChecklistAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  renameChecklistAction,
  setChecklistItemDueDateAction,
  toggleChecklistItemDoneAction,
  unassignChecklistItemAction,
  updateChecklistItemTitleAction,
} from "@/app/actions/checklist";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeChecklistProgress } from "@/lib/agency/checklist-progress";
import { cn } from "@/lib/utils";

export type ChecklistAssigneeOption = {
  id: string;
  name: string;
  sectorId: string;
};

export type ChecklistItemView = {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  dueDate?: Date | string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  linkedDemandId?: string | null;
};

export type ChecklistView = {
  id: string;
  title: string;
  sortOrder: number;
  items: ChecklistItemView[];
};

function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function nextChecklistTitle(existing: ChecklistView[]) {
  if (existing.length === 0) return "Checklist";
  return `Checklist ${existing.length + 1}`;
}

export function DemandChecklist({
  demandId,
  clientId,
  checklists: initialChecklists,
  assignees = [],
  canEdit = false,
  onOpenLinkedDemand,
}: {
  demandId: string;
  clientId: string;
  checklists: ChecklistView[];
  assignees?: ChecklistAssigneeOption[];
  canEdit?: boolean;
  onOpenLinkedDemand?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checklists, setChecklists] = useState(initialChecklists);
  const [hideDone, setHideDone] = useState<Record<string, boolean>>({});
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    setChecklists(initialChecklists);
    setDraftTitles({});
    setNewItemTitles({});
  }, [initialChecklists, demandId]);

  const sortedAssignees = useMemo(
    () => [...assignees].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [assignees]
  );

  function refresh(recipe: (prev: ChecklistView[]) => ChecklistView[]) {
    setChecklists((prev) => recipe(prev));
    router.refresh();
  }

  function patchItem(
    checklistId: string,
    itemId: string,
    patch: Partial<ChecklistItemView>
  ) {
    refresh((prev) =>
      prev.map((cl) =>
        cl.id !== checklistId
          ? cl
          : {
              ...cl,
              items: cl.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            }
      )
    );
  }

  function handleCreateChecklist() {
    startTransition(async () => {
      const result = await createChecklistAction({
        demandId,
        clientId,
        title: nextChecklistTitle(checklists),
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível criar o checklist."
        );
        return;
      }
      refresh((prev) => [
        ...prev,
        {
          id: result.checklist.id,
          title: result.checklist.title,
          sortOrder: result.checklist.sortOrder,
          items: [],
        },
      ]);
    });
  }

  function handleRename(checklistId: string) {
    const title = (draftTitles[checklistId] ?? "").trim();
    const current = checklists.find((c) => c.id === checklistId);
    if (!current || !title || title === current.title) {
      setDraftTitles((prev) => {
        const next = { ...prev };
        delete next[checklistId];
        return next;
      });
      return;
    }
    startTransition(async () => {
      const result = await renameChecklistAction({
        checklistId,
        clientId,
        title,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível renomear o checklist."
        );
        return;
      }
      refresh((prev) =>
        prev.map((cl) =>
          cl.id === checklistId ? { ...cl, title: result.checklist.title } : cl
        )
      );
      setDraftTitles((prev) => {
        const next = { ...prev };
        delete next[checklistId];
        return next;
      });
    });
  }

  function handleDeleteChecklist(checklistId: string) {
    startTransition(async () => {
      const result = await deleteChecklistAction({ checklistId, clientId });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível apagar o checklist."
        );
        return;
      }
      refresh((prev) => prev.filter((cl) => cl.id !== checklistId));
    });
  }

  function handleAddItem(checklistId: string) {
    const title = (newItemTitles[checklistId] ?? "").trim();
    if (!title) return;
    startTransition(async () => {
      const result = await addChecklistItemAction({
        checklistId,
        clientId,
        title,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível adicionar o item."
        );
        return;
      }
      const item = result.item;
      setNewItemTitles((prev) => ({ ...prev, [checklistId]: "" }));
      refresh((prev) =>
        prev.map((cl) =>
          cl.id !== checklistId
            ? cl
            : {
                ...cl,
                items: [
                  ...cl.items,
                  {
                    id: item.id,
                    title: item.title,
                    isDone: item.isDone,
                    sortOrder: item.sortOrder,
                    dueDate: item.dueDate,
                    assigneeId: item.assigneeId,
                    assignee: null,
                    linkedDemandId: item.linkedDemandId,
                  },
                ],
              }
        )
      );
    });
  }

  function handleToggle(checklistId: string, item: ChecklistItemView) {
    startTransition(async () => {
      const result = await toggleChecklistItemDoneAction({
        itemId: item.id,
        clientId,
        isDone: !item.isDone,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível atualizar o item."
        );
        return;
      }
      patchItem(checklistId, item.id, { isDone: result.item.isDone });
    });
  }

  function handleItemTitleBlur(
    checklistId: string,
    item: ChecklistItemView,
    nextTitle: string
  ) {
    const title = nextTitle.trim();
    if (!title || title === item.title) return;
    startTransition(async () => {
      const result = await updateChecklistItemTitleAction({
        itemId: item.id,
        clientId,
        title,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível atualizar o título."
        );
        return;
      }
      patchItem(checklistId, item.id, { title: result.item.title });
    });
  }

  function handleDueDate(
    checklistId: string,
    itemId: string,
    dueDate: string
  ) {
    startTransition(async () => {
      const result = await setChecklistItemDueDateAction({
        itemId,
        clientId,
        dueDate: dueDate || null,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível atualizar o prazo."
        );
        return;
      }
      patchItem(checklistId, itemId, { dueDate: result.item.dueDate });
    });
  }

  function handleAssign(
    checklistId: string,
    itemId: string,
    assigneeId: string
  ) {
    startTransition(async () => {
      if (!assigneeId) {
        const result = await unassignChecklistItemAction({ itemId, clientId });
        if (!("success" in result) || !result.success) {
          toast.error(
            "error" in result
              ? result.error
              : "Não foi possível remover o responsável."
          );
          return;
        }
        patchItem(checklistId, itemId, {
          assigneeId: null,
          assignee: null,
          linkedDemandId: result.item.linkedDemandId,
        });
        return;
      }

      const result = await assignChecklistItemAction({
        itemId,
        clientId,
        assigneeId,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível atribuir o item."
        );
        return;
      }
      const name =
        sortedAssignees.find((a) => a.id === assigneeId)?.name ?? "";
      patchItem(checklistId, itemId, {
        assigneeId: result.item.assigneeId,
        assignee: result.item.assigneeId
          ? { id: result.item.assigneeId, name }
          : null,
        linkedDemandId: result.item.linkedDemandId,
      });
    });
  }

  function handleDeleteItem(checklistId: string, itemId: string) {
    startTransition(async () => {
      const result = await deleteChecklistItemAction({ itemId, clientId });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível apagar o item."
        );
        return;
      }
      refresh((prev) =>
        prev.map((cl) =>
          cl.id !== checklistId
            ? cl
            : { ...cl, items: cl.items.filter((i) => i.id !== itemId) }
        )
      );
    });
  }

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const progress = computeChecklistProgress(checklist.items);
        const hidden = hideDone[checklist.id] ?? false;
        const visibleItems = hidden
          ? checklist.items.filter((item) => !item.isDone)
          : checklist.items;
        const titleValue = draftTitles[checklist.id] ?? checklist.title;

        return (
          <section
            key={checklist.id}
            className="space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center gap-2">
              {canEdit ? (
                <Input
                  value={titleValue}
                  disabled={pending}
                  aria-label={`Título do checklist ${checklist.id}`}
                  className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-border focus-visible:bg-background"
                  onChange={(e) =>
                    setDraftTitles((prev) => ({
                      ...prev,
                      [checklist.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleRename(checklist.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              ) : (
                <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {checklist.title}
                </h3>
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      disabled={pending}
                      aria-label="Menu do checklist"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setHideDone((prev) => ({
                          ...prev,
                          [checklist.id]: !hidden,
                        }))
                      }
                    >
                      {hidden ? "Mostrar concluídos" : "Ocultar concluídos"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteChecklist(checklist.id)}
                    >
                      Apagar checklist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <ul className="space-y-1">
              {visibleItems.map((item) => {
                const assigneeName =
                  item.assignee?.name ??
                  sortedAssignees.find((a) => a.id === item.assigneeId)
                    ?.name ??
                  null;
                return (
                  <li
                    key={item.id}
                    className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={item.isDone}
                      disabled={!canEdit || pending}
                      className="mt-1"
                      onCheckedChange={() =>
                        canEdit ? handleToggle(checklist.id, item) : undefined
                      }
                      aria-label={`Concluir ${item.title}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      {canEdit ? (
                        <Input
                          defaultValue={item.title}
                          key={`${item.id}-${item.title}`}
                          disabled={pending}
                          className={cn(
                            "h-8 min-w-0 flex-1 border-transparent bg-transparent px-1 text-sm shadow-none focus-visible:border-border focus-visible:bg-background",
                            item.isDone &&
                              "text-muted-foreground line-through"
                          )}
                          onBlur={(e) =>
                            handleItemTitleBlur(
                              checklist.id,
                              item,
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      ) : (
                        <p
                          className={cn(
                            "text-sm",
                            item.isDone
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          )}
                        >
                          {item.title}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {assigneeName ? (
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground"
                            title={assigneeName}
                          >
                            {initials(assigneeName)}
                          </span>
                        ) : null}
                        {canEdit ? (
                          <Input
                            type="date"
                            value={toDateInputValue(item.dueDate)}
                            disabled={pending}
                            className="h-7 w-[9.5rem] text-xs"
                            onChange={(e) =>
                              handleDueDate(
                                checklist.id,
                                item.id,
                                e.target.value
                              )
                            }
                            aria-label={`Prazo de ${item.title}`}
                          />
                        ) : item.dueDate ? (
                          <span className="text-xs text-muted-foreground">
                            {toDateInputValue(item.dueDate)}
                          </span>
                        ) : null}
                        {item.linkedDemandId && onOpenLinkedDemand ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={pending}
                            onClick={() =>
                              onOpenLinkedDemand(item.linkedDemandId!)
                            }
                          >
                            Abrir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {canEdit ? (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                            disabled={pending}
                            aria-label={`Menu do item ${item.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-1.5">
                            <p className="mb-1 text-xs text-muted-foreground">
                              Responsável
                            </p>
                            <Select
                              value={
                                item.assigneeId ||
                                item.assignee?.id ||
                                "__none__"
                              }
                              onValueChange={(v) =>
                                handleAssign(
                                  checklist.id,
                                  item.id,
                                  v === "__none__" ? "" : v
                                )
                              }
                              disabled={pending || sortedAssignees.length === 0}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Sem responsável" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  Sem responsável
                                </SelectItem>
                                {sortedAssignees.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              handleDeleteItem(checklist.id, item.id)
                            }
                          >
                            Apagar item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {canEdit ? (
              <Input
                value={newItemTitles[checklist.id] ?? ""}
                disabled={pending}
                placeholder="Adicionar um item"
                className="h-8"
                onChange={(e) =>
                  setNewItemTitles((prev) => ({
                    ...prev,
                    [checklist.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem(checklist.id);
                  }
                }}
              />
            ) : null}
          </section>
        );
      })}

      {canEdit ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={handleCreateChecklist}
          className="w-full sm:w-auto"
        >
          Adicionar checklist
        </Button>
      ) : null}
    </div>
  );
}
