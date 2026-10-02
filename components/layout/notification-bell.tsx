"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationItem } from "@/components/notifications/notification-row";
import {
  getUnreadNotificationCountAction,
  listRecentNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationRow,
} from "@/lib/actions/notifications.actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/agency/notification-display";
import { cn } from "@/lib/utils";

const COUNT_POLL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationRow[] | null>(null);

  const refreshCount = useCallback(() => {
    getUnreadNotificationCountAction()
      .then(setCount)
      .catch(() => {});
  }, []);

  const loadItems = useCallback(() => {
    listRecentNotificationsAction(8)
      .then((r) => {
        setItems(r.items);
        setCount(r.unread);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, COUNT_POLL_MS);
    function onChanged() {
      refreshCount();
      if (open) loadItems();
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    };
  }, [refreshCount, loadItems, open]);

  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  function activate(n: NotificationRow) {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      setCount((c) => Math.max(0, c - 1));
      void markNotificationReadAction(n.id).then(() =>
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
      );
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  function markAll() {
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
    setCount(0);
    void markAllNotificationsReadAction().then(() =>
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
    );
  }

  const shown = (items ?? []).filter((n) => tab === "all" || !n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 shrink-0">
          <Bell className="h-5 w-5" aria-hidden />
          <span className="sr-only">
            {count > 0 ? `Notificações, ${count} não lidas` : "Notificações"}
          </span>
          {count > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            >
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(25rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl p-0 shadow-lg"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
            Notificações
          </h2>
          <button
            type="button"
            onClick={markAll}
            disabled={count === 0}
            className="rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          >
            Marcar todas como lidas
          </button>
        </div>
        <div className="flex gap-1 border-b border-border px-3 pb-2" role="tablist" aria-label="Filtro">
          {(
            [
              ["all", "Todas"],
              ["unread", "Não lidas"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {key === "unread" && count > 0 ? (
                <span className="ml-1 font-semibold text-primary">{count}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="max-h-[min(26rem,60vh)] overflow-y-auto">
          {items === null ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                <Check className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-medium">Tudo em dia</p>
              <p className="text-xs text-muted-foreground">
                Quando algo precisar da sua atenção, aparece aqui.
              </p>
            </div>
          ) : (
            <ul>
              {shown.map((n) => (
                <NotificationItem key={n.id} n={n} onActivate={activate} />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border bg-muted/40 px-4 py-2.5 text-center">
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todas as notificações
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
