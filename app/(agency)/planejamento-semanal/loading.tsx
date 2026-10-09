import { Skeleton } from "@/components/ui/skeleton";

export default function PlanningLoading() {
  return (
    <div className="flex flex-col gap-3 p-1 sm:p-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando planejamento…</span>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-96 w-56 shrink-0 rounded-xl" />
        <Skeleton className="h-96 flex-1 rounded-xl" />
      </div>
    </div>
  );
}
