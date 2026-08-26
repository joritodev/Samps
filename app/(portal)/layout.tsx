import { Toaster } from "sonner";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { PortalPreviewBanner } from "@/components/portal/portal-preview-banner";
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
        <PortalSidebar user={user} clientName={clientName} isPreview={isPreview} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background pt-14 lg:pt-0">
          {isPreview ? (
            <PortalPreviewBanner>
              Você está visualizando o portal como cliente. Nada aqui reflete a
              operação interna.
            </PortalPreviewBanner>
          ) : null}
          <div className="flex-1 p-6 md:p-8">{children}</div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </Providers>
  );
}
