"use server";

import { db } from "@/lib/db";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import {
  listActiveAnnouncements,
  listTodayBirthdays,
} from "@/lib/services/announcements.service";
import {
  listUserNotifications,
  parseNotificationPrefs,
} from "@/lib/services/notifications.service";

export async function pollLiveAlertsAction() {
  const user = await requireAuth();
  const [announcements, birthdays, notifications, row] = await Promise.all([
    listActiveAnnouncements(),
    listTodayBirthdays(clientScopeFilter(user)),
    listUserNotifications(user.id, true),
    db.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    }),
  ]);

  return {
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      kind: a.kind as "INFO" | "URGENT" | "CELEBRATION",
    })),
    birthdays,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
    prefs: parseNotificationPrefs(row?.notificationPrefs),
  };
}
