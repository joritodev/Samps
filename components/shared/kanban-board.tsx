"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { DemandCard } from "./demand-card";

type Column = { id: string; title: string };
type Demand = Parameters<typeof DemandCard>[0]["demand"];

export function KanbanBoard({
  columns,
  itemsByColumn,
}: {
  columns: Column[];
  itemsByColumn: Record<string, Demand[]>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const allItems = Object.values(itemsByColumn).flat();
  const activeItem = allItems.find((d) => d.id === activeId);

  function handleDragEnd() {
    setActiveId(null);
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
              items={(itemsByColumn[col.id] ?? []).map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(itemsByColumn[col.id] ?? []).map((demand) => (
                  <DemandCard key={demand.id} demand={demand} showOrigin />
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
