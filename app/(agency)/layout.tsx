import { Toaster } from "sonner";
import { AgencySidebar } from "@/components/agency/agency-sidebar";
import { Providers } from "@/components/providers";
import { getCurrentAgencyUser } from "@/lib/agency/current-user";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAgencyUser();

  return (
    <Providers>
      <div className="flex h-dvh overflow-hidden bg-background">
        <AgencySidebar user={user} />
        <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {children}
          </div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </Providers>
  );
}
