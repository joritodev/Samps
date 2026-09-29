import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto genérico das telas da agência enquanto o servidor responde. */
export default function AgencyLoading() {
  return (
    <div className="flex flex-col gap-4 p-1 sm:p-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
