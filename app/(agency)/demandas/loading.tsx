import { Skeleton } from "@/components/ui/skeleton";

/** Colunas do Kanban com cards fantasmas enquanto as demandas carregam. */
export default function DemandasLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando demandas…</span>
      <div className="space-y-2 px-1 pb-4 pt-1 sm:px-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-1 sm:px-2">
        {Array.from({ length: 4 }).map((_, col) => (
          <div
            key={col}
            className="flex w-80 shrink-0 flex-col gap-2 rounded-xl border border-border/60 bg-foreground/[0.025] p-2.5"
          >
            <Skeleton className="mx-1 my-1.5 h-4 w-28" />
            {Array.from({ length: 3 - (col % 2) }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
