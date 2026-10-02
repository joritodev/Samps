"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/check";
import {
  countUnreadNotifications,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/services/notifications.service";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export async function getUnreadNotificationCountAction() {
  const user = await requireAuth();
  return countUnreadNotifications(user.id);
}

/** Últimas notificações (para a janelinha do sino). */
export async function listRecentNotificationsAction(limit = 8): Promise<{
  items: NotificationRow[];
  unread: number;
}> {
  const user = await requireAuth();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 8, 1), 50);
  const [rows, unread] = await Promise.all([
    listUserNotifications(user.id, false),
    countUnreadNotifications(user.id),
  ]);
  return {
    items: rows.slice(0, safeLimit).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  };
}

/** Só marca a notificação do próprio usuário (o serviço filtra por `userId`). */
export async function markNotificationReadAction(id: string) {
  const user = await requireAuth();
  if (typeof id !== "string" || !id) return { success: false as const };
  await markNotificationRead(id, user.id);
  revalidatePath("/notificacoes");
  return { success: true as const };
}

export async function markAllNotificationsReadAction() {
  const user = await requireAuth();
  const r = await markAllNotificationsRead(user.id);
  revalidatePath("/notificacoes");
  return { success: true as const, count: r.count };
}
