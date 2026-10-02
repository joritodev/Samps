import { Suspense } from "react";
import { Toaster } from "sonner";
import { AgencySidebar } from "@/components/agency/agency-sidebar";
import { LiveAlertsHost } from "@/components/agency/live-alerts-host";
import { DailySummaryGate } from "@/components/performance/daily-summary-gate";
import { Providers } from "@/components/providers";
import { MorphOriginTracker } from "@/components/motion/morph-origin-tracker";
import { getCurrentAgencyUser } from "@/lib/agency/current-user";
import { clientScopeFilter } from "@/lib/permissions/check";
import {
  listActiveAnnouncements,
  listTodayBirthdays,
} from "@/lib/services/announcements.service";
import { allowedSearchTypes } from "@/lib/services/search.service";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAgencyUser();
  const clientScope = clientScopeFilter(user);
  const [announcements, birthdays] = await Promise.all([
    listActiveAnnouncements(),
    listTodayBirthdays(clientScope),
  ]);

  return (
    <Providers>
      <MorphOriginTracker />
      <div className="print-flow flex h-dvh overflow-hidden bg-shell">
        <AgencySidebar
          user={user}
          searchTypes={allowedSearchTypes(user)}
          announcements={announcements.map((a) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            kind: a.kind,
            authorName: a.author.name,
            startsAt: a.startsAt.toISOString(),
            endsAt: a.endsAt?.toISOString() ?? null,
          }))}
          birthdays={birthdays}
        />
        {/* Painel principal “inset”: sobe uma camada sobre o shell (ref.: Linear,
            Attio, sidebar inset do shadcn) — no mobile ocupa a tela toda. */}
        <main className="print-flow flex min-w-0 flex-1 flex-col overflow-hidden bg-background pt-14 lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:border-border/70 lg:pt-0 lg:shadow-sm">
          <div className="print-flow flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="print-flow flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-5">
              {children}
            </div>
          </div>
        </main>
        <LiveAlertsHost />
        <Suspense fallback={null}>
          <DailySummaryGate />
        </Suspense>
        <Toaster className="print:hidden" richColors position="top-right" visibleToasts={3} />
      </div>
    </Providers>
  );
}
