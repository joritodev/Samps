"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreHorizontal,
  SendHorizontal,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  addChecklistItemAction,
  assignChecklistItemAction,
  createChecklistAction,
  openChecklistItemAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  renameChecklistAction,
  reorderChecklistItemsAction,
  setChecklistItemDueDateAction,
  toggleChecklistItemDoneAction,
  unassignChecklistItemAction,
} from "@/app/actions/checklist";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { computeChecklistProgress } from "@/lib/agency/checklist-progress";
import { cn } from "@/lib/utils";

export type ChecklistAssigneeOption = {
  id: string;
  name: string;
  sectorId: string;
  avatarUrl?: string | null;
};

export type ChecklistItemView = {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  dueDate?: Date | string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
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

function AssigneePicker({
  item,
  assignees,
  disabled,
  onAssign,
}: {
  item: ChecklistItemView;
  assignees: ChecklistAssigneeOption[];
  disabled?: boolean;
  onAssign: (assigneeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const assignee =
    item.assignee ??
    (item.assigneeId
      ? assignees.find((a) => a.id === item.assigneeId) ?? null
      : null);
  const hasAssignee = Boolean(assignee);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {hasAssignee && assignee ? (
          <button
            type="button"
            disabled={disabled}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Atribuir responsável"
            title={assignee.name}
          >
            <Avatar className="h-7 w-7">
              {assignee.avatarUrl ? (
                <AvatarImage src={assignee.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-[10px] font-medium">
                {initials(assignee.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="Atribuir responsável"
          >
            <UserRoundPlus className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {assignees.map((user) => (
          <button
            key={user.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              onAssign(user.id);
              setOpen(false);
            }}
          >
            <Avatar className="h-6 w-6">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{user.name}</span>
          </button>
        ))}
        {hasAssignee ? (
          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => {
              onAssign("");
              setOpen(false);
            }}
          >
            Remover responsável
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function SortableChecklistItem({
  item,
  canEdit,
  pending,
  assignees,
  onToggle,
  onOpen,
  onDueDate,
  onAssign,
  onDelete,
}: {
  item: ChecklistItemView;
  canEdit: boolean;
  pending: boolean;
  assignees: ChecklistAssigneeOption[];
  onToggle: () => void;
  onOpen?: () => void;
  onDueDate: (dueDate: string) => void;
  onAssign: (assigneeId: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40",
        isDragging && "opacity-50"
      )}
    >
      {canEdit ? (
        <button
          type="button"
          className="mt-1 inline-flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
          aria-label={`Reordenar ${item.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <Checkbox
        checked={item.isDone}
        disabled={!canEdit || pending}
        className="mt-1"
        onCheckedChange={() => (canEdit ? onToggle() : undefined)}
        aria-label={`Concluir ${item.title}`}
      />
      <div className="min-w-0 flex-1 space-y-1">
        {onOpen ? (
          <button
            type="button"
            disabled={pending}
            className={cn(
              "block w-full truncate rounded-sm px-1 text-left text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.isDone
                ? "text-muted-foreground line-through"
                : "text-foreground"
            )}
            onClick={onOpen}
          >
            {item.title}
          </button>
        ) : (
          <p
            className={cn(
              "truncate px-1 text-sm",
              item.isDone
                ? "text-muted-foreground line-through"
                : "text-foreground"
            )}
          >
            {item.title}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <AssigneePicker
              item={item}
              assignees={assignees}
              disabled={pending || assignees.length === 0}
              onAssign={onAssign}
            />
          ) : item.assignee || item.assigneeId ? (
            <Avatar className="h-7 w-7" title={item.assignee?.name}>
              {item.assignee?.avatarUrl ? (
                <AvatarImage src={item.assignee.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-[10px] font-medium">
                {initials(
                  item.assignee?.name ??
                    assignees.find((a) => a.id === item.assigneeId)?.name ??
                    "?"
                )}
              </AvatarFallback>
            </Avatar>
          ) : null}
          {canEdit ? (
            <Input
              type="date"
              value={toDateInputValue(item.dueDate)}
              disabled={pending}
              className="h-7 w-[9.5rem] text-xs"
              onChange={(e) => onDueDate(e.target.value)}
              aria-label={`Prazo de ${item.title}`}
            />
          ) : item.dueDate ? (
            <span className="text-xs text-muted-foreground">
              {toDateInputValue(item.dueDate)}
            </span>
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              Apagar item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function ChecklistItemsList({
  checklist,
  visibleItems,
  canEdit,
  pending,
  assignees,
  onReorder,
  onToggle,
  onOpen,
  onDueDate,
  onAssign,
  onDelete,
}: {
  checklist: ChecklistView;
  visibleItems: ChecklistItemView[];
  canEdit: boolean;
  pending: boolean;
  assignees: ChecklistAssigneeOption[];
  onReorder: (orderedItemIds: string[]) => void;
  onToggle: (item: ChecklistItemView) => void;
  onOpen?: (item: ChecklistItemView) => void;
  onDueDate: (itemId: string, dueDate: string) => void;
  onAssign: (itemId: string, assigneeId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = visibleItems.map((item) => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedVisible = arrayMove(visibleItems, oldIndex, newIndex);
    const visibleIdSet = new Set(reorderedVisible.map((item) => item.id));
    let vIdx = 0;
    const orderedItemIds = checklist.items.map((item) => {
      if (visibleIdSet.has(item.id)) {
        return reorderedVisible[vIdx++]!.id;
      }
      return item.id;
    });
    onReorder(orderedItemIds);
  }

  const list = (
    <ul className="space-y-1">
      {visibleItems.map((item) => (
        <SortableChecklistItem
          key={item.id}
          item={item}
          canEdit={canEdit}
          pending={pending}
          assignees={assignees}
          onToggle={() => onToggle(item)}
          onOpen={onOpen ? () => onOpen(item) : undefined}
          onDueDate={(dueDate) => onDueDate(item.id, dueDate)}
          onAssign={(assigneeId) => onAssign(item.id, assigneeId)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </ul>
  );

  if (!canEdit) return list;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </DndContext>
  );
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

  function handleOpenItem(checklistId: string, item: ChecklistItemView) {
    if (!onOpenLinkedDemand) return;
    startTransition(async () => {
      if (item.linkedDemandId) {
        onOpenLinkedDemand(item.linkedDemandId);
        return;
      }
      const result = await openChecklistItemAction({
        itemId: item.id,
        clientId,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result ? result.error : "Não foi possível abrir o item."
        );
        return;
      }
      patchItem(checklistId, item.id, { linkedDemandId: result.demandId });
      onOpenLinkedDemand(result.demandId);
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
      const user = sortedAssignees.find((a) => a.id === assigneeId);
      patchItem(checklistId, itemId, {
        assigneeId: result.item.assigneeId,
        assignee: result.item.assigneeId
          ? {
              id: result.item.assigneeId,
              name: user?.name ?? "",
              avatarUrl: user?.avatarUrl,
            }
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

  function handleReorder(checklistId: string, orderedItemIds: string[]) {
    const byId = new Map(
      (checklists.find((c) => c.id === checklistId)?.items ?? []).map((item) => [
        item.id,
        item,
      ])
    );
    const nextItems = orderedItemIds
      .map((id, index) => {
        const item = byId.get(id);
        return item ? { ...item, sortOrder: index } : null;
      })
      .filter((item): item is ChecklistItemView => item !== null);

    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId ? { ...cl, items: nextItems } : cl
      )
    );

    startTransition(async () => {
      const result = await reorderChecklistItemsAction({
        checklistId,
        clientId,
        orderedItemIds,
      });
      if (!("success" in result) || !result.success) {
        toast.error(
          "error" in result
            ? result.error
            : "Não foi possível reordenar os itens."
        );
        setChecklists(initialChecklists);
        return;
      }
      router.refresh();
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

            <ChecklistItemsList
              checklist={checklist}
              visibleItems={visibleItems}
              canEdit={canEdit}
              pending={pending}
              assignees={sortedAssignees}
              onReorder={(orderedItemIds) =>
                handleReorder(checklist.id, orderedItemIds)
              }
              onToggle={(item) => handleToggle(checklist.id, item)}
              onOpen={
                onOpenLinkedDemand
                  ? (item) => handleOpenItem(checklist.id, item)
                  : undefined
              }
              onDueDate={(itemId, dueDate) =>
                handleDueDate(checklist.id, itemId, dueDate)
              }
              onAssign={(itemId, assigneeId) =>
                handleAssign(checklist.id, itemId, assigneeId)
              }
              onDelete={(itemId) => handleDeleteItem(checklist.id, itemId)}
            />

            {canEdit ? (
              <div className="flex items-center gap-1">
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
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  disabled={pending}
                  aria-label="Adicionar item"
                  onClick={() => handleAddItem(checklist.id)}
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </div>
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
