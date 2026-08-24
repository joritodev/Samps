import { Toaster } from "sonner";
import { AgencySidebar } from "@/components/agency/agency-sidebar";
import { AnnouncementBanner } from "@/components/agency/announcement-banner";
import { Providers } from "@/components/providers";
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
      <div className="flex h-dvh overflow-hidden bg-background">
        <AgencySidebar user={user} searchTypes={allowedSearchTypes(user)} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background pt-14 lg:pt-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AnnouncementBanner
              announcements={announcements.map((a) => ({
                id: a.id,
                title: a.title,
                message: a.message,
                kind: a.kind,
              }))}
              birthdays={birthdays}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-5">
              {children}
            </div>
          </div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </Providers>
  );
}
