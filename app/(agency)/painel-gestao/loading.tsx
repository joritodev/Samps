import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo desenho do painel: título, KPIs, fluxo, cargas e prioridades. */
export default function PainelLoading() {
  return (
    <div className="flex flex-col gap-3 p-1 sm:p-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando painel…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="mt-1 h-[68px] w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
