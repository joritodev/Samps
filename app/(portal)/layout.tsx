import { Toaster } from "sonner";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { Providers } from "@/components/providers";
import { requireAuth } from "@/lib/permissions/check";
import { getPortalClientId, getPortalForClient } from "@/lib/services/portal.service";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const clientId = await getPortalClientId(user);
  const portal = clientId ? await getPortalForClient(clientId) : null;
  const clientName =
    portal?.displayName ??
    portal?.client.tradeName ??
    portal?.client.name ??
    "Portal do Cliente";

  const isPreview = user.userType !== "EXTERNAL_CLIENT";

  return (
    <Providers>
      <div className="flex h-dvh overflow-hidden bg-background">
        <PortalSidebar user={user} clientName={clientName} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {isPreview ? (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
              Você está visualizando o portal como cliente. Nada aqui reflete a
              operação interna.
            </div>
          ) : null}
          <div className="flex-1 p-6">{children}</div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </Providers>
  );
}
