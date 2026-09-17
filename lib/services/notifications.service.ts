import { NotificationType, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Grupos de preferência na UI de configurações. */
export type NotificationPrefGroup =
  | "DEADLINE"
  | "ASSIGNMENT"
  | "ADJUSTMENT"
  | "PUBLICATION"
  | "OTHER";

export const NOTIFICATION_PREF_GROUPS: {
  key: NotificationPrefGroup;
  label: string;
  description: string;
}[] = [
  {
    key: "DEADLINE",
    label: "Prazos",
    description: "Prazos próximos e demandas atrasadas",
  },
  {
    key: "ASSIGNMENT",
    label: "Atribuições",
    description: "Novas demandas e mudanças de responsável",
  },
  {
    key: "ADJUSTMENT",
    label: "Ajustes e comentários",
    description: "Ajustes solicitados e novos comentários",
  },
  {
    key: "PUBLICATION",
    label: "Publicações e liberações",
    description: "Conteúdo publicado e info liberada ao cliente",
  },
  {
    key: "OTHER",
    label: "Outros",
    description: "Convites, projetos, captações e demais alertas",
  },
];

export type DeliveryPrefKey =
  | "toastAnnouncements"
  | "soundAnnouncements"
  | "toastNotifications"
  | "soundNotifications";

export type NotificationPrefs = Record<NotificationPrefGroup, boolean> &
  Record<DeliveryPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  DEADLINE: true,
  ASSIGNMENT: true,
  ADJUSTMENT: true,
  PUBLICATION: true,
  OTHER: true,
  toastAnnouncements: true,
  soundAnnouncements: false,
  toastNotifications: true,
  soundNotifications: false,
};

function groupForType(type: NotificationType): NotificationPrefGroup {
  switch (type) {
    case NotificationType.DEADLINE_NEAR:
    case NotificationType.DEMAND_OVERDUE:
      return "DEADLINE";
    case NotificationType.NEW_DEMAND:
    case NotificationType.DEMAND_ASSIGNED:
    case NotificationType.RESPONSIBLE_CHANGED:
      return "ASSIGNMENT";
    case NotificationType.ADJUSTMENT_REQUESTED:
    case NotificationType.NEW_COMMENT:
      return "ADJUSTMENT";
    case NotificationType.INFO_RELEASED:
      return "PUBLICATION";
    default:
      return "OTHER";
  }
}

export function parseNotificationPrefs(
  raw: Prisma.JsonValue | null | undefined
): NotificationPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    DEADLINE: obj.DEADLINE !== false,
    ASSIGNMENT: obj.ASSIGNMENT !== false,
    ADJUSTMENT: obj.ADJUSTMENT !== false,
    PUBLICATION: obj.PUBLICATION !== false,
    OTHER: obj.OTHER !== false,
    toastAnnouncements: obj.toastAnnouncements !== false,
    soundAnnouncements: obj.soundAnnouncements === true,
    toastNotifications: obj.toastNotifications !== false,
    soundNotifications: obj.soundNotifications === true,
  };
}

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { notificationPrefs: true },
  });
  const prefs = parseNotificationPrefs(user?.notificationPrefs);
  const group = groupForType(params.type);
  if (!prefs[group]) return null;

  return db.notification.create({ data: params });
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs
) {
  return db.user.update({
    where: { id: userId },
    data: { notificationPrefs: prefs },
    select: { id: true, notificationPrefs: true },
  });
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
