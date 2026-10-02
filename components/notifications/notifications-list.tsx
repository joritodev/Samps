"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-row";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationRow,
} from "@/lib/actions/notifications.actions";
import {
  DAY_BUCKETS,
  GROUP_LABEL,
  NOTIFICATIONS_CHANGED_EVENT,
  dayBucket,
  notificationGroup,
  type NotificationGroupKey,
} from "@/lib/agency/notification-display";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | NotificationGroupKey;

const GROUP_FILTERS: NotificationGroupKey[] = ["DEADLINE", "ASSIGNMENT", "ADJUSTMENT", "PUBLICATION"];

export function NotificationsList({ initial }: { initial: NotificationRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");

  const unread = items.filter((n) => !n.read).length;

  const visible = useMemo(
    () =>
      items.filter((n) =>
        filter === "all"
          ? true
          : filter === "unread"
            ? !n.read
            : notificationGroup(n.type) === filter
      ),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const now = new Date();
    return DAY_BUCKETS.map((bucket) => ({
      bucket,
      rows: visible.filter((n) => dayBucket(new Date(n.createdAt), now) === bucket),
    })).filter((g) => g.rows.length > 0);
  }, [visible]);

  function changed() {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }

  function markRead(n: NotificationRow) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    void markNotificationReadAction(n.id).then(changed);
  }

  function activate(n: NotificationRow) {
    markRead(n);
    if (n.link) router.push(n.link);
  }

  function markAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    void markAllNotificationsReadAction().then(changed);
  }

  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "Todas", count: items.length },
    { key: "unread", label: "Não lidas", count: unread },
    ...GROUP_FILTERS.map((g) => ({ key: g as Filter, label: GROUP_LABEL[g] })),
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Notificações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Alertas do fluxo operacional</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={unread === 0} onClick={markAll}>
          <Check className="size-4" aria-hidden />
          Marcar todas como lidas
        </Button>
      </div>

      <div className="mb-3 mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Filtros">
        {chips.map((c, i) => (
          <span key={c.key} className="contents">
            {i === 2 ? <span aria-hidden className="mx-1 w-px self-stretch bg-border" /> : null}
            <button
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                filter === c.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
              {c.count !== undefined ? <span className="ml-1.5 opacity-70">{c.count}</span> : null}
            </button>
          </span>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center shadow-xs">
          <span className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-success/10 text-success">
            <Check className="size-6" aria-hidden />
          </span>
          <h2 className="font-display text-base font-semibold">
            {items.length === 0 ? "Tudo em dia" : "Nada por aqui"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "Quando algo precisar da sua atenção, aparece aqui."
              : "Nenhuma notificação neste filtro."}
          </p>
        </div>
      ) : (
        grouped.map((g) => (
          <section key={g.bucket} aria-label={g.bucket}>
            <h2 className="mb-1.5 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.bucket}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              {g.rows.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onActivate={activate}
                  actions={
                    <>
                      {!n.read ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => markRead(n)}>
                          Marcar como lida
                        </Button>
                      ) : null}
                      {n.link ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => activate(n)}>
                          Abrir
                        </Button>
                      ) : null}
                    </>
                  }
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
