"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, Megaphone, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BannerAnnouncement = {
  id: string;
  title: string;
  message: string;
  kind: "INFO" | "URGENT" | "CELEBRATION";
};

export type BannerBirthday = {
  id: string;
  name: string;
  kindOf: "client" | "user";
};

const STORAGE_KEY = "samps:avisos-vistos";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function AnnouncementBanner({
  announcements,
  birthdays,
}: {
  announcements: BannerAnnouncement[];
  birthdays: BannerBirthday[];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  const items = useMemo(() => {
    const birthdayItems = birthdays.map((b) => ({
      id: `birthday:${b.kindOf}:${b.id}`,
      title:
        b.kindOf === "client"
          ? `Aniversário do cliente ${b.name}`
          : `Aniversário de ${b.name}`,
      message:
        b.kindOf === "client"
          ? "Lembrete do mural: cliente faz aniversário hoje."
          : "Lembrete do mural: colega faz aniversário hoje.",
      kind: "CELEBRATION" as const,
      isBirthday: true,
    }));

    const announcementItems = announcements.map((a) => ({
      ...a,
      isBirthday: false,
    }));

    return [...announcementItems, ...birthdayItems]
      .filter((item) => !dismissed.includes(item.id))
      .slice(0, 3);
  }, [announcements, birthdays, dismissed]);

  if (!ready || items.length === 0) return null;

  function dismiss(id: string) {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <div className="shrink-0 space-y-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
      {items.map((item) => {
        const urgent = item.kind === "URGENT";
        const celebration = item.kind === "CELEBRATION" || item.isBirthday;
        return (
          <Alert
            key={item.id}
            variant={urgent ? "destructive" : "default"}
            className={cn(
              "relative pr-12",
              celebration &&
                !urgent &&
                "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-100"
            )}
          >
            {item.isBirthday ? (
              <Cake className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            <AlertTitle className="text-sm font-semibold">{item.title}</AlertTitle>
            <AlertDescription className="text-sm">{item.message}</AlertDescription>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={() => dismiss(item.id)}
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}
