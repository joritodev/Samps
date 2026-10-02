import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Apresentação de notificações (seguro para o navegador: não importa Prisma).
 * Os tipos espelham `NotificationType`; o grupo espelha o das preferências.
 */
export type NotificationTypeKey =
  | "NEW_DEMAND"
  | "DEMAND_ASSIGNED"
  | "RESPONSIBLE_CHANGED"
  | "DEADLINE_NEAR"
  | "DEMAND_OVERDUE"
  | "NEW_COMMENT"
  | "ADJUSTMENT_REQUESTED"
  | "PROJECT_UPDATED"
  | "SHOOT_SCHEDULED"
  | "INFO_RELEASED"
  | "USER_INVITE"
  | "OTHER";

export type NotificationGroupKey =
  | "DEADLINE"
  | "ASSIGNMENT"
  | "ADJUSTMENT"
  | "PUBLICATION"
  | "OTHER";

export const GROUP_LABEL: Record<NotificationGroupKey, string> = {
  DEADLINE: "Prazos",
  ASSIGNMENT: "Atribuições",
  ADJUSTMENT: "Ajustes e comentários",
  PUBLICATION: "Publicações",
  OTHER: "Outros",
};

export function notificationGroup(type: string): NotificationGroupKey {
  switch (type) {
    case "DEADLINE_NEAR":
    case "DEMAND_OVERDUE":
      return "DEADLINE";
    case "NEW_DEMAND":
    case "DEMAND_ASSIGNED":
    case "RESPONSIBLE_CHANGED":
      return "ASSIGNMENT";
    case "ADJUSTMENT_REQUESTED":
    case "NEW_COMMENT":
      return "ADJUSTMENT";
    case "INFO_RELEASED":
      return "PUBLICATION";
    default:
      return "OTHER";
  }
}

/** Tom do ícone: cor só quando significa algo (ajuste, atraso, publicação). */
export type NotificationTone = "neutral" | "attention" | "danger" | "success";

export function notificationTone(type: string): NotificationTone {
  switch (type) {
    case "ADJUSTMENT_REQUESTED":
      return "attention";
    case "DEMAND_OVERDUE":
      return "danger";
    case "INFO_RELEASED":
      return "success";
    default:
      return "neutral";
  }
}

export type IconKey = "adjust" | "user" | "mention" | "clock" | "check" | "bell" | "calendar";

export function notificationIcon(type: string, title = ""): IconKey {
  switch (type) {
    case "ADJUSTMENT_REQUESTED":
      return "adjust";
    case "NEW_DEMAND":
    case "DEMAND_ASSIGNED":
    case "RESPONSIBLE_CHANGED":
      return "user";
    case "NEW_COMMENT":
      return "mention";
    case "DEADLINE_NEAR":
    case "DEMAND_OVERDUE":
      return "clock";
    case "INFO_RELEASED":
      return "check";
    case "SHOOT_SCHEDULED":
      return "calendar";
    default:
      // "OTHER" cobre publicação/revisão: o título diz o que é.
      return /publica|pronto/i.test(title) ? "check" : "bell";
  }
}

export type DayBucket = "Hoje" | "Ontem" | "Esta semana" | "Anteriores";
export const DAY_BUCKETS: DayBucket[] = ["Hoje", "Ontem", "Esta semana", "Anteriores"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayBucket(date: Date, now: Date = new Date()): DayBucket {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000
  );
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return "Esta semana";
  return "Anteriores";
}

/** "há 12 min", "há 3 h", "ontem", "30 set". */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "agora";
  const bucket = dayBucket(date, now);
  if (bucket === "Hoje") {
    return formatDistanceStrict(date, now, { locale: ptBR, addSuffix: true, roundingMethod: "floor" })
      .replace("há cerca de ", "há ")
      .replace(" minutos", " min")
      .replace(" minuto", " min")
      .replace(" horas", " h")
      .replace(" hora", " h");
  }
  if (bucket === "Ontem") return "ontem";
  return format(date, "d MMM", { locale: ptBR }).replace(".", "");
}
export const NOTIFICATIONS_CHANGED_EVENT = "samps:notifications-changed";
