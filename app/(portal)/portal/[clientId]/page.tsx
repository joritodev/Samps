import { PortalImpersonationRedirect } from "@/components/clients/portal-impersonation-redirect";
import { requireClientAccess } from "@/lib/permissions/check";

/**
 * Entrada de "Visualizar como cliente": marca a impersonação na sessão e
 * devolve o usuário ao portal real, que passa a ler os dados desse cliente.
 */
export default async function PortalAsClientPage({
  params,
}: {
  params: { clientId: string };
}) {
  await requireClientAccess(params.clientId);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <PortalImpersonationRedirect clientId={params.clientId} />
    </div>
  );
}
