import { requireAuth } from "@/lib/permissions/check";
import { getPortalFiles } from "@/lib/services/portal.service";
import { PortalArquivos } from "@/components/portal/portal-subpages";

export default async function PortalArquivosPage() {
  const user = await requireAuth();
  const files = await getPortalFiles(user);

  return <PortalArquivos files={files} />;
}
