import { NotificationSettings } from "@/components/agency/notification-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { db } from "@/lib/db";
import { parseNotificationPrefs } from "@/lib/services/notifications.service";

export default async function NotificacoesSettingsPage() {
  const user = await requireSettingsSection("/configuracoes/notificacoes");
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { notificationPrefs: true },
  });

  return (
    <NotificationSettings
      initial={parseNotificationPrefs(row?.notificationPrefs)}
    />
  );
}
