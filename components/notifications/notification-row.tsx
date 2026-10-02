"use client";

import { relativeTime } from "@/lib/agency/notification-display";
import type { NotificationRow } from "@/lib/actions/notifications.actions";
import { NotificationIcon } from "@/components/notifications/notification-visual";
import { cn } from "@/lib/utils";

/**
 * Uma notificação. O corpo inteiro é um botão (ativar = marcar como lida e abrir);
 * `actions` aparece ao passar o mouse ou focar (só na página completa).
 */
export function NotificationItem({
  n,
  onActivate,
  actions,
  className,
}: {
  n: NotificationRow;
  onActivate: (n: NotificationRow) => void;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      data-unread={!n.read}
      className={cn(
        "group/n relative border-b border-border/80 last:border-b-0",
        !n.read && "bg-primary/[0.045]",
        className
      )}
    >
      {!n.read ? (
        <span
          aria-hidden
          className="absolute left-2.5 top-[22px] size-1.5 rounded-full bg-primary"
        />
      ) : null}
      <button
        type="button"
        onClick={() => onActivate(n)}
        className="grid w-full grid-cols-[2rem_1fr_auto] items-start gap-2.5 py-3 pl-6 pr-4 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <NotificationIcon type={n.type} title={n.title} />
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[13px]",
              n.read ? "font-medium text-foreground/80" : "font-semibold text-foreground"
            )}
          >
            {n.title}
            {!n.read ? <span className="sr-only"> (não lida)</span> : null}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted-foreground">
            {n.message}
          </span>
        </span>
        <time
          dateTime={n.createdAt}
          className={cn(
            "whitespace-nowrap pt-0.5 text-[11px] text-muted-foreground",
            actions && "group-hover/n:invisible group-focus-within/n:invisible"
          )}
        >
          {relativeTime(new Date(n.createdAt))}
        </time>
      </button>
      {actions ? (
        <div className="invisible absolute right-3 top-2.5 flex items-center gap-2 group-hover/n:visible group-focus-within/n:visible">
          {actions}
        </div>
      ) : null}
    </li>
  );
}
