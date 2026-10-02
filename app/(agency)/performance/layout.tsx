import { PerformanceTabs } from "@/components/performance/performance-tabs";

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Performance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Como a operação está indo, comparada ao período anterior
        </p>
      </header>
      <PerformanceTabs />
      {children}
    </div>
  );
}
