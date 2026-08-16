"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DemandCard } from "@/components/shared/demand-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  archiveBoardListAction,
  createBoardListAction,
  renameBoardListAction,
} from "@/lib/actions/board.actions";
import { moveCardAction } from "@/lib/actions/cards.actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Column = { id: string; title: string };
type Demand = Parameters<typeof DemandCard>[0]["demand"] & {
  id: string;
  listId?: string | null;
};

function SortableDemandCard({
  demand,
  onSelect,
}: {
  demand: Demand;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: demand.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div onClick={() => onSelect(demand.id)}>
        <DemandCard
          demand={demand}
          showOrigin
          className={cn(isDragging && "opacity-50")}
        />
      </div>
    </div>
  );
}

export function BoardKanban({
  clientId,
  boardId,
  columns: initialColumns,
  itemsByColumn,
  onCardSelect,
  canManageLists = false,
}: {
  clientId: string;
  boardId: string;
  columns: Column[];
  itemsByColumn: Record<string, Demand[]>;
  onCardSelect: (id: string) => void;
  canManageLists?: boolean;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const allItems = Object.values(itemsByColumn).flat();
  const activeItem = allItems.find((d) => d.id === activeId);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const demandId = String(active.id);
    let targetListId = String(over.id);
    const overDemand = allItems.find((d) => d.id === targetListId);
    if (overDemand?.listId) {
      targetListId = overDemand.listId as string;
    }

    const columnIds = columns.map((c) => c.id);
    if (!columnIds.includes(targetListId)) return;

    const current = allItems.find((d) => d.id === demandId);
    if (!current || current.listId === targetListId) return;

    startTransition(async () => {
      await moveCardAction(demandId, clientId, targetListId, 0);
    });
  }

  function submitNewColumn() {
    const name = newColumnName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createBoardListAction(boardId, clientId, name);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.list) {
        setColumns((prev) => [
          ...prev,
          { id: result.list!.id, title: result.list!.name },
        ]);
      }
      setNewColumnName("");
      setAddingColumn(false);
      toast.success("Coluna criada");
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden p-6 snap-x snap-mandatory">
        {columns.map((col) => {
          const cards = itemsByColumn[col.id] ?? [];
          return (
            <section
              key={col.id}
              className="flex h-full w-80 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-muted/80"
            >
              <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-3.5">
                {renamingId === col.id ? (
                  <Input
                    className="h-8"
                    value={renameValue}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        startTransition(async () => {
                          const result = await renameBoardListAction(
                            col.id,
                            clientId,
                            renameValue
                          );
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }
                          setColumns((prev) =>
                            prev.map((c) =>
                              c.id === col.id
                                ? { ...c, title: renameValue.trim() }
                                : c
                            )
                          );
                          setRenamingId(null);
                          toast.success("Coluna renomeada");
                          router.refresh();
                        });
                      }
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {col.title}
                  </h3>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {cards.length}
                  </span>
                  {canManageLists ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Opções da coluna"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingId(col.id);
                            setRenameValue(col.title);
                          }}
                        >
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (
                              !confirm(
                                `Arquivar "${col.title}"? Só funciona sem cartões na coluna.`
                              )
                            ) {
                              return;
                            }
                            startTransition(async () => {
                              const result = await archiveBoardListAction(
                                col.id,
                                clientId
                              );
                              if (result.error) {
                                toast.error(result.error);
                                return;
                              }
                              setColumns((prev) =>
                                prev.filter((c) => c.id !== col.id)
                              );
                              toast.success("Coluna arquivada");
                              router.refresh();
                            });
                          }}
                        >
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </header>
              <SortableContext
                id={col.id}
                items={cards.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3"
                  data-list-id={col.id}
                >
                  {cards.length > 0 ? (
                    cards.map((demand) => (
                      <SortableDemandCard
                        key={demand.id}
                        demand={demand}
                        onSelect={onCardSelect}
                      />
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      Nenhum cartão
                    </div>
                  )}
                </div>
              </SortableContext>
            </section>
          );
        })}

        {canManageLists ? (
          <section className="flex h-fit w-80 shrink-0 snap-start flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
            {addingColumn ? (
              <>
                <Input
                  placeholder="Nome da coluna"
                  value={newColumnName}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitNewColumn();
                    if (e.key === "Escape") {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitNewColumn}>
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="ghost"
                className="justify-start text-muted-foreground"
                onClick={() => setAddingColumn(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar coluna
              </Button>
            )}
          </section>
        ) : null}
      </div>
      <DragOverlay>
        {activeItem ? (
          <DemandCard
            demand={activeItem}
            showOrigin
            className="rotate-2 opacity-90"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
