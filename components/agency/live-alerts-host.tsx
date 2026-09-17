"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { pollLiveAlertsAction } from "@/app/actions/live-alerts";
import { Button } from "@/components/ui/button";
import {
  MURAL_DISMISS_KEY,
  OPEN_MURAL_EVENT,
} from "@/components/agency/mural-popover";
import {
  diffNewIds,
  muralAnnouncementId,
  rememberIds,
} from "@/lib/agency/live-alerts";
import type { NotificationPrefs } from "@/lib/services/notifications.service";
import { cn } from "@/lib/utils";

const SEEN_TOASTS_KEY = "samps:toasts-vistos";
const BASELINE_KEY = "samps:toast-baseline";
export const MUTE_KEY = "samps:avisos-mudo";

function readJsonIds(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeJsonIds(key: string, ids: string[]) {
  sessionStorage.setItem(key, JSON.stringify(ids));
}

function dismissMuralId(id: string) {
  try {
    const raw = localStorage.getItem(MURAL_DISMISS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const current = Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
    localStorage.setItem(
      MURAL_DISMISS_KEY,
      JSON.stringify(Array.from(new Set([...current, id])))
    );
  } catch {
    /* ignore */
  }
}

export function playAlertTone(kind: "announcement" | "notification") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "announcement" ? 880 : 660;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    void ctx.resume();
    osc.start();
    const ms = kind === "announcement" ? 180 : 120;
    window.setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, ms);
  } catch {
    /* autoplay bloqueado */
  }
}

function AnnouncementToast({
  title,
  message,
  kind,
  muralId,
  toastId,
}: {
  title: string;
  message: string;
  kind: "INFO" | "URGENT" | "CELEBRATION";
  muralId: string;
  toastId: string | number;
}) {
  const urgent = kind === "URGENT";
  const celebration = kind === "CELEBRATION";
  return (
    <div
      className={cn(
        "w-[min(100%,22rem)] rounded-xl border border-border bg-card p-4 shadow-lg",
        urgent &&
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-50",
        celebration &&
          !urgent &&
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-50"
      )}
    >
      <div className="flex gap-2">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">
            {kind === "URGENT"
              ? "Urgente"
              : kind === "CELEBRATION"
                ? "Celebração"
                : "Informativo"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            dismissMuralId(muralId);
            toast.dismiss(toastId);
          }}
        >
          Dispensar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            window.dispatchEvent(new Event(OPEN_MURAL_EVENT));
            toast.dismiss(toastId);
          }}
        >
          Ver mural
        </Button>
      </div>
    </div>
  );
}

export function LiveAlertsHost() {
  const router = useRouter();
  const baselineDone = useRef(false);
  const polling = useRef(false);

  const runPoll = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const payload = await pollLiveAlertsAction();
      const announcementIds = payload.announcements.map((a) =>
        muralAnnouncementId(a.id)
      );
      const notificationIds = payload.notifications.map(
        (n) => `notification:${n.id}`
      );
      const currentIds = [...announcementIds, ...notificationIds];
      const seen = readJsonIds(SEEN_TOASTS_KEY);

      if (!baselineDone.current && !sessionStorage.getItem(BASELINE_KEY)) {
        writeJsonIds(SEEN_TOASTS_KEY, rememberIds(seen, currentIds));
        sessionStorage.setItem(BASELINE_KEY, "1");
        baselineDone.current = true;
        return;
      }
      baselineDone.current = true;

      const fresh = diffNewIds(currentIds, seen);
      if (fresh.length === 0) return;

      writeJsonIds(SEEN_TOASTS_KEY, rememberIds(seen, fresh));
      if (fresh.some((id) => id.startsWith("announcement:"))) {
        router.refresh();
      }
      const muted = sessionStorage.getItem(MUTE_KEY) === "1";
      const hidden = document.hidden;
      const prefs: NotificationPrefs = payload.prefs;

      for (const id of fresh) {
        if (id.startsWith("announcement:")) {
          const rawId = id.slice("announcement:".length);
          const item = payload.announcements.find((a) => a.id === rawId);
          if (!item) continue;
          if (prefs.toastAnnouncements) {
            toast.custom(
              (t) => (
                <AnnouncementToast
                  title={item.title}
                  message={item.message}
                  kind={item.kind}
                  muralId={id}
                  toastId={t}
                />
              ),
              { duration: 12000 }
            );
          }
          if (!muted && !hidden && prefs.soundAnnouncements) {
            playAlertTone("announcement");
          }
          continue;
        }
        if (id.startsWith("notification:")) {
          const rawId = id.slice("notification:".length);
          const item = payload.notifications.find((n) => n.id === rawId);
          if (!item) continue;
          if (prefs.toastNotifications) {
            toast(item.title, {
              description: item.message,
              duration: 8000,
              action: item.link
                ? {
                    label: "Abrir",
                    onClick: () => {
                      window.location.href = item.link!;
                    },
                  }
                : undefined,
            });
          }
          if (!muted && !hidden && prefs.soundNotifications) {
            playAlertTone("notification");
          }
        }
      }
    } catch {
      /* poll silencioso */
    } finally {
      polling.current = false;
    }
  }, [router]);

  useEffect(() => {
    void runPoll();
    const interval = window.setInterval(() => {
      void runPoll();
    }, 20_000);
    function onVis() {
      if (document.visibilityState === "visible") void runPoll();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [runPoll]);

  return null;
}

export function SessionMuteButton() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sessionStorage.getItem(MUTE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Ativar som dos avisos" : "Silenciar avisos"}
    >
      {muted ? (
        <VolumeX className="h-5 w-5" aria-hidden />
      ) : (
        <Volume2 className="h-5 w-5" aria-hidden />
      )}
    </Button>
  );
}
