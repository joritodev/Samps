"use client";

import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPrefsAction } from "@/lib/actions/settings.actions";
import {
  NOTIFICATION_PREF_GROUPS,
  type NotificationPrefs,
} from "@/lib/services/notifications.service";

export function NotificationSettings({
  initial,
}: {
  initial: NotificationPrefs;
}) {
  const [pending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState(initial);

  function save() {
    startTransition(async () => {
      const r = await updateNotificationPrefsAction(prefs);
      if ("success" in r && r.success) toast.success("Preferências salvas");
      else toast.error("error" in r ? r.error : "Erro");
    });
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Notificações
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Quais alertas in-app você quer receber
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-3">
          {NOTIFICATION_PREF_GROUPS.map((g) => (
            <div
              key={g.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <Label className="text-sm font-medium">{g.label}</Label>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </div>
              <Switch
                checked={prefs[g.key]}
                onCheckedChange={(v) =>
                  setPrefs((p) => ({ ...p, [g.key]: v }))
                }
              />
            </div>
          ))}

          <div className="space-y-3 pt-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Alertas na tela
              </h2>
              <p className="text-xs text-muted-foreground">
                Pop-ups e som desta sessão, sem e-mail nem push.
              </p>
            </div>
            {(
              [
                {
                  key: "toastAnnouncements" as const,
                  label: "Pop-up de avisos gerais",
                },
                {
                  key: "soundAnnouncements" as const,
                  label: "Som de avisos gerais",
                },
                {
                  key: "toastNotifications" as const,
                  label: "Pop-up de notificações",
                },
                {
                  key: "soundNotifications" as const,
                  label: "Som de notificações",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
              >
                <Label className="text-sm font-medium">{item.label}</Label>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(v) =>
                    setPrefs((p) => ({ ...p, [item.key]: v }))
                  }
                />
              </div>
            ))}
          </div>

          <Button disabled={pending} onClick={save}>
            Salvar preferências
          </Button>

          <Link
            href="/notificacoes"
            className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Ver caixa de notificações
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
