"use client";

import { Cake, Megaphone, TriangleAlert, X } from "lucide-react";
import { NotificationIcon } from "@/components/notifications/notification-visual";
import { cn } from "@/lib/utils";

export type AlertKind = "urgent" | "celebration" | "info" | "notification";

type Action = { label: string; onClick: () => void; primary?: boolean };

/**
 * Pop-up "cartão limpo": cartão branco, borda fina, ícone em círculo. A cor
 * (terracota) só aparece no aviso urgente; o resto é neutro. Fonte do sistema
 * explícita: o sonner usa a dele por padrão.
 */
export function AlertCard({
  kind,
  title,
  message,
  notificationType,
  birthday,
  actions,
  onClose,
}: {
  kind: AlertKind;
  title: string;
  message: string;
  notificationType?: string;
  birthday?: boolean;
  actions?: Action[];
  onClose: () => void;
}) {
  const urgent = kind === "urgent";
  const celebration = kind === "celebration";
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn(
        "grid w-[min(100vw-2rem,23.5rem)] grid-cols-[2rem_1fr_auto] gap-2.5 rounded-[14px] border bg-card p-3.5 font-sans text-card-foreground shadow-lg",
        urgent ? "border-urgent/40" : "border-border"
      )}
    >
      {kind === "notification" ? (
        <NotificationIcon type={notificationType ?? "OTHER"} title={title} />
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid size-8 place-items-center rounded-full",
            urgent && "bg-urgent/[0.11] text-urgent",
            celebration && "bg-celebration/[0.14] text-celebration",
            kind === "info" && "bg-secondary text-muted-foreground"
          )}
        >
          {urgent ? (
            <TriangleAlert className="size-4" />
          ) : birthday ? (
            <Cake className="size-4" />
          ) : (
            <Megaphone className="size-4" />
          )}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {message ? (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{message}</p>
        ) : null}
        {actions && actions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={cn(
                  "rounded-[7px] border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  a.primary
                    ? urgent
                      ? "border-urgent text-urgent hover:bg-urgent/[0.08]"
                      : "border-primary text-primary hover:bg-primary/[0.08]"
                    : "border-border text-foreground/80 hover:bg-foreground/[0.04]"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
