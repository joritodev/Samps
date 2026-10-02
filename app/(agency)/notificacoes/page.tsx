import { NotificationsList } from "@/components/notifications/notifications-list";
import { requireAuth } from "@/lib/permissions/check";
import { listUserNotifications } from "@/lib/services/notifications.service";

export default async function AgencyNotificacoesPage() {
  const user = await requireAuth();
  const notifications = await listUserNotifications(user.id);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <NotificationsList
        initial={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
