export function computeChecklistProgress(
  items: { isDone: boolean }[]
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => i.isDone).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}
