import { requireAuth } from "@/lib/permissions/check";
import { listUserNotifications } from "@/lib/services/notifications.service";
import { PortalNotificacoes } from "@/components/portal/portal-subpages";

export default async function PortalNotificacoesPage() {
  const user = await requireAuth();
  const notifications = await listUserNotifications(user.id);

  return <PortalNotificacoes notifications={notifications} />;
}
