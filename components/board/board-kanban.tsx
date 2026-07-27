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
import { useState, useTransition } from "react";
import { DemandCard } from "@/components/shared/demand-card";
import { moveCardAction } from "@/lib/actions/cards.actions";
import { cn } from "@/lib/utils";

type Column = { id: string; title: string };
type Demand = Parameters<typeof DemandCard>[0]["demand"] & { id: string; listId?: string | null };

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
  columns,
  itemsByColumn,
  onCardSelect,
}: {
  clientId: string;
  columns: Column[];
  itemsByColumn: Record<string, Demand[]>;
  onCardSelect: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-soft"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {(itemsByColumn[col.id] ?? []).length}
              </span>
            </div>
            <SortableContext
              id={col.id}
              items={(itemsByColumn[col.id] ?? []).map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[80px] space-y-2" data-list-id={col.id}>
                {(itemsByColumn[col.id] ?? []).map((demand) => (
                  <SortableDemandCard
                    key={demand.id}
                    demand={demand}
                    onSelect={onCardSelect}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <DemandCard demand={activeItem} showOrigin className="rotate-2 opacity-90" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
