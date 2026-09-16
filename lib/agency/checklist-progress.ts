export function computeChecklistProgress(
  children: { status: string }[]
): { done: number; total: number } {
  const total = children.length;
  const done = children.filter(
    (c) =>
      c.status === "DONE" ||
      c.status === "PUBLISHED" ||
      c.status === "DELIVERED"
  ).length;
  return { done, total };
}
