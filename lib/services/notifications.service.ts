import { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  return db.notification.create({ data: params });
}

export async function listUserNotifications(userId: string, unreadOnly = false) {
  return db.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function countUnreadNotifications(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(id: string, userId: string) {
  return db.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
