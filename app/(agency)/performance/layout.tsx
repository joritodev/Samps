import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";
import { PerformanceTabs } from "@/components/performance/performance-tabs";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";

export default async function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  if (user.userType === UserType.EXTERNAL_CLIENT) redirect("/login");
  const analytics = hasPermission(user.permissions, "productivity.view");

  return (
    <div className="print-flow h-full min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6">
      <header className="print:hidden">
        <h1 className="text-2xl font-semibold text-foreground">Performance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Como a operação está indo, comparada ao período anterior
        </p>
      </header>
      <PerformanceTabs analytics={analytics} />
      {children}
    </div>
  );
}
