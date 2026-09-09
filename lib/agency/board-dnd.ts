export type KanbanDropOver = {
  id: string | number;
  data?: {
    current?: {
      sortable?: { containerId?: string | number };
    };
  };
} | null;

/** Destino do drop: coluna droppable ou containerId do card sob o ponteiro. */
export function resolveKanbanDropTarget(
  over: KanbanDropOver,
  columnIds: readonly string[]
): string | null {
  if (!over) return null;
  const overId = String(over.id);
  if (columnIds.includes(overId)) return overId;
  const containerId = over.data?.current?.sortable?.containerId;
  if (containerId == null) return null;
  const id = String(containerId);
  return columnIds.includes(id) ? id : null;
}

export function moveDemandToList<T extends { id: string; listId?: string | null }>(
  grouped: Record<string, T[]>,
  demandId: string,
  targetListId: string
): Record<string, T[]> {
  const next: Record<string, T[]> = Object.fromEntries(
    Object.entries(grouped).map(([key, cards]) => [key, [...cards]])
  );

  let moved: T | undefined;
  for (const cards of Object.values(next)) {
    const index = cards.findIndex((card) => card.id === demandId);
    if (index >= 0) {
      [moved] = cards.splice(index, 1);
      break;
    }
  }

  if (!moved) return grouped;
  next[targetListId] = [
    { ...moved, listId: targetListId },
    ...(next[targetListId] ?? []),
  ];
  return next;
}
