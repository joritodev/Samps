"use server";

import { requireAuth } from "@/lib/permissions/check";
import { countUnreadNotifications } from "@/lib/services/notifications.service";

export async function getUnreadNotificationCountAction() {
  const user = await requireAuth();
  return countUnreadNotifications(user.id);
}
