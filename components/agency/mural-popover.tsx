"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cake, Megaphone, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SessionMuteButton } from "@/components/agency/session-mute-button";
import { relativeTime } from "@/lib/agency/notification-display";
import { cn } from "@/lib/utils";
import {
  muralAnnouncementId,
  muralBirthdayId,
} from "@/lib/agency/live-alerts";
import type {
  BannerAnnouncement,
  BannerBirthday,
} from "@/components/agency/announcement-banner";

export const MURAL_DISMISS_KEY = "samps:avisos-vistos";
export const OPEN_MURAL_EVENT = "samps:open-mural";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MURAL_DISMISS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    window.localStorage.setItem(MURAL_DISMISS_KEY, JSON.stringify(ids));
  } catch {
    /* sem armazenamento: o aviso só some até recarregar */
  }
}

export type MuralItem = {
  id: string;
  title: string;
  message: string;
  kind: "INFO" | "URGENT" | "CELEBRATION";
  isBirthday: boolean;
  meta: string;
};

function announcementMeta(a: BannerAnnouncement) {
  const parts: string[] = [];
  if (a.authorName) parts.push(a.authorName);
  if (a.startsAt) parts.push(relativeTime(new Date(a.startsAt)));
  if (a.endsAt) {
    parts.push(`até ${format(new Date(a.endsAt), "d MMM", { locale: ptBR }).replace(".", "")}`);
  }
  return parts.join(" · ");
}

export function MuralPopover({
  announcements,
  birthdays,
}: {
  announcements: BannerAnnouncement[];
  birthdays: BannerBirthday[];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "seen">("new");

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      setTab("new");
    }
    window.addEventListener(OPEN_MURAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MURAL_EVENT, onOpen);
  }, []);

  const all = useMemo<MuralItem[]>(
    () => [
      ...announcements.map((a) => ({
        id: muralAnnouncementId(a.id),
        title: a.title,
        message: a.message,
        kind: a.kind,
        isBirthday: false,
        meta: announcementMeta(a),
      })),
      ...birthdays.map((b) => ({
        id: muralBirthdayId(b),
        title:
          b.kindOf === "client"
            ? `Aniversário do cliente ${b.name}`
            : b.age
              ? `${b.name} faz ${b.age} anos hoje`
              : `Aniversário de ${b.name}`,
        message: "",
        kind: "CELEBRATION" as const,
        isBirthday: true,
        meta: b.kindOf === "client" ? "Cliente" : "Colega",
      })),
    ],
    [announcements, birthdays]
  );

  const fresh = all.filter((i) => !dismissed.includes(i.id));
  const seen = all.filter((i) => dismissed.includes(i.id));
  const hasUrgent = fresh.some((i) => i.kind === "URGENT");
  const count = fresh.length;

  const groups = [
    { key: "urgent", label: "Urgente", items: fresh.filter((i) => i.kind === "URGENT") },
    {
      key: "notices",
      label: "Comunicados",
      items: fresh.filter((i) => i.kind !== "URGENT" && !i.isBirthday),
    },
    { key: "birthdays", label: "Aniversários hoje", items: fresh.filter((i) => i.isBirthday) },
  ].filter((g) => g.items.length > 0);

  function setSeen(ids: string[], isSeen: boolean) {
    const next = isSeen
      ? Array.from(new Set([...dismissed, ...ids]))
      : dismissed.filter((d) => !ids.includes(d));
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={count > 0 ? `Avisos, ${count} novos` : "Avisos"}
        >
          <Megaphone className="h-5 w-5" aria-hidden />
          {ready && count > 0 ? (
            <span
              data-urgent={hasUrgent}
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none",
                hasUrgent
                  ? "bg-urgent text-background"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(25.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl p-0 shadow-lg"
      >
        <div className="flex items-center justify-between pb-1 pl-4 pr-2 pt-3">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
            Avisos
          </h2>
          <SessionMuteButton />
        </div>
        <div className="flex gap-1 border-b border-border px-3 pb-2" role="tablist" aria-label="Avisos">
          {(
            [
              ["new", "Novos", count],
              ["seen", "Vistos", 0],
            ] as const
          ).map(([key, label, n]) => (
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
              {n > 0 ? <span className="ml-1 font-semibold text-primary">{n}</span> : null}
            </button>
          ))}
        </div>

        <div className="max-h-[min(30rem,65vh)] overflow-y-auto">
          {tab === "new" ? (
            groups.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum aviso novo.
              </p>
            ) : (
              groups.map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <h3 className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </h3>
                  <ul>
                    {g.items.map((item) => (
                      <AvisoItem
                        key={item.id}
                        item={item}
                        actionLabel="Dispensar"
                        onAction={() => setSeen([item.id], true)}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )
          ) : seen.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nada visto ainda.
            </p>
          ) : (
            <ul>
              {seen.map((item) => (
                <AvisoItem
                  key={item.id}
                  item={item}
                  muted
                  actionLabel="Marcar como novo"
                  onAction={() => setSeen([item.id], false)}
                />
              ))}
            </ul>
          )}
        </div>

        {tab === "new" && count > 1 ? (
          <div className="border-t border-border bg-muted/40 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={() => setSeen(fresh.map((i) => i.id), true)}
              className="rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Dispensar todos
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function AvisoItem({
  item,
  actionLabel,
  onAction,
  muted,
}: {
  item: MuralItem;
  actionLabel?: string;
  onAction?: () => void;
  muted?: boolean;
}) {
  const urgent = item.kind === "URGENT";
  const celebration = item.kind === "CELEBRATION";
  const Icon = urgent ? TriangleAlert : item.isBirthday ? Cake : celebration ? Sparkles : Megaphone;
  return (
    <li
      className={cn(
        "relative grid grid-cols-[2rem_1fr] gap-2.5 border-b border-border/80 py-3 pl-5 pr-4 last:border-b-0",
        "before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-r",
        urgent && !muted && "before:bg-urgent",
        celebration && !muted && "before:bg-celebration",
        muted && "opacity-75"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 place-items-center rounded-full",
          urgent
            ? "bg-urgent/[0.11] text-urgent"
            : celebration
              ? "bg-celebration/[0.14] text-celebration"
              : "bg-secondary text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug">{item.title}</p>
        {item.message ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{item.message}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {urgent || (celebration && !item.isBirthday) ? (
            <span
              className={cn(
                "rounded-full px-2 py-px text-[10.5px] font-semibold",
                urgent ? "bg-urgent/[0.11] text-urgent" : "bg-celebration/[0.14] text-celebration"
              )}
            >
              {urgent ? "Urgente" : "Celebração"}
            </span>
          ) : null}
          {item.meta ? <span>{item.meta}</span> : null}
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="ml-auto rounded-md text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
