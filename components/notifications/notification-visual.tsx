import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  notificationIcon,
  notificationTone,
  type IconKey,
  type NotificationTone,
} from "@/lib/agency/notification-display";
import { cn } from "@/lib/utils";

const ICONS: Record<IconKey, LucideIcon> = {
  adjust: CornerDownLeft,
  user: UserPlus,
  mention: AtSign,
  clock: Clock,
  check: CheckCircle2,
  bell: Bell,
  calendar: CalendarClock,
};

export const TONE_CLASS: Record<NotificationTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  attention: "bg-urgent/[0.11] text-urgent",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

/** Cor só quando significa algo: o resto fica neutro. */
export function NotificationIcon({
  type,
  title,
  className,
}: {
  type: string;
  title?: string;
  className?: string;
}) {
  const Icon = ICONS[notificationIcon(type, title)];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full",
        TONE_CLASS[notificationTone(type)],
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
