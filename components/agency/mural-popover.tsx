"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  muralAnnouncementId,
  muralBirthdayId,
} from "@/lib/agency/live-alerts";
import type { BannerAnnouncement, BannerBirthday } from "@/components/agency/announcement-banner";

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
  window.localStorage.setItem(MURAL_DISMISS_KEY, JSON.stringify(ids));
}

const KIND_LABEL = {
  INFO: "Informativo",
  URGENT: "Urgente",
  CELEBRATION: "Celebração",
} as const;

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

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_MURAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MURAL_EVENT, onOpen);
  }, []);

  const announcementItems = useMemo(
    () =>
      announcements
        .map((a) => ({
          id: muralAnnouncementId(a.id),
          title: a.title,
          message: a.message,
          kind: a.kind,
          isBirthday: false as const,
        }))
        .filter((item) => !dismissed.includes(item.id)),
    [announcements, dismissed]
  );

  const birthdayItems = useMemo(
    () =>
      birthdays
        .map((b) => ({
          id: muralBirthdayId(b),
          title:
            b.kindOf === "client"
              ? `Aniversário do cliente ${b.name}`
              : `Aniversário de ${b.name}`,
          message:
            b.kindOf === "client"
              ? "Cliente faz aniversário hoje."
              : "Colega faz aniversário hoje.",
          kind: "CELEBRATION" as const,
          isBirthday: true as const,
        }))
        .filter((item) => !dismissed.includes(item.id)),
    [birthdays, dismissed]
  );

  const count = announcementItems.length + birthdayItems.length;

  function dismiss(id: string) {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            count > 0 ? `Mural, ${count} avisos` : "Mural de avisos"
          }
        >
          <Megaphone className="h-5 w-5" aria-hidden />
          {ready && count > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 border-0 bg-primary px-1 text-[10px] text-primary-foreground">
              {count > 9 ? "9+" : count}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3">
        <p className="text-sm font-medium text-foreground">Mural</p>
        {announcementItems.length === 0 && birthdayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aviso no mural.
          </p>
        ) : (
          <>
            {announcementItems.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Avisos gerais
                </h2>
                <ul className="space-y-2">
                  {announcementItems.map((item) => (
                    <MuralItem
                      key={item.id}
                      item={item}
                      onDismiss={() => dismiss(item.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
            {birthdayItems.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aniversários hoje
                </h2>
                <ul className="space-y-2">
                  {birthdayItems.map((item) => (
                    <MuralItem
                      key={item.id}
                      item={item}
                      onDismiss={() => dismiss(item.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MuralItem({
  item,
  onDismiss,
}: {
  item: {
    id: string;
    title: string;
    message: string;
    kind: "INFO" | "URGENT" | "CELEBRATION";
    isBirthday: boolean;
  };
  onDismiss: () => void;
}) {
  const urgent = item.kind === "URGENT";
  const celebration = item.kind === "CELEBRATION" || item.isBirthday;
  return (
    <li
      className={cn(
        "relative rounded-lg border border-border bg-card px-3 py-2 pr-9",
        urgent &&
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100",
        celebration &&
          !urgent &&
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-100"
      )}
    >
      <div className="flex items-start gap-2">
        {item.isBirthday ? (
          <Cake className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.message}</p>
          <Badge variant="outline" className="text-[10px]">
            {KIND_LABEL[item.kind]}
          </Badge>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1 h-7 w-7"
        onClick={onDismiss}
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
