"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { pollLiveAlertsAction } from "@/app/actions/live-alerts";
import { MUTE_KEY } from "@/components/agency/session-mute-button";
import { AlertCard } from "@/components/notifications/alert-card";
import { markNotificationReadAction } from "@/lib/actions/notifications.actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/agency/notification-display";
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

const SEEN_TOASTS_KEY = "samps:toasts-vistos";
const BASELINE_KEY = "samps:toast-baseline";

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

function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
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
  return (
    <AlertCard
      kind={urgent ? "urgent" : kind === "CELEBRATION" ? "celebration" : "info"}
      title={title}
      message={message}
      actions={
        urgent
          ? [
              {
                label: "Entendi",
                primary: true,
                onClick: () => {
                  dismissMuralId(muralId);
                  toast.dismiss(toastId);
                },
              },
              {
                label: "Ver aviso",
                onClick: () => {
                  window.dispatchEvent(new Event(OPEN_MURAL_EVENT));
                  toast.dismiss(toastId);
                },
              },
            ]
          : undefined
      }
      onClose={() => toast.dismiss(toastId)}
    />
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
              { duration: item.kind === "URGENT" ? Infinity : 8000 }
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
            toast.custom(
              (t) => (
                <AlertCard
                  kind="notification"
                  notificationType={item.type}
                  title={item.title}
                  message={item.message}
                  actions={[
                    ...(item.link
                      ? [
                          {
                            label: "Abrir",
                            primary: true,
                            onClick: () => {
                              void markNotificationReadAction(item.id).then(
                                notifyNotificationsChanged
                              );
                              toast.dismiss(t);
                              router.push(item.link!);
                            },
                          },
                        ]
                      : []),
                    {
                      label: "Marcar como lida",
                      onClick: () => {
                        void markNotificationReadAction(item.id).then(
                          notifyNotificationsChanged
                        );
                        toast.dismiss(t);
                      },
                    },
                  ]}
                  onClose={() => toast.dismiss(t)}
                />
              ),
              { duration: 8000 }
            );
            notifyNotificationsChanged();
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
