"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePortalSettingsAction } from "@/lib/actions/settings.actions";

export function PortalSettings({
  initial,
}: {
  initial: {
    portalName: string;
    portalLogoUrl: string | null;
    portalColor: string;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    portalName: initial.portalName,
    portalLogoUrl: initial.portalLogoUrl ?? "",
    portalColor: initial.portalColor || "#0f172a",
  });

  function save() {
    startTransition(async () => {
      const r = await updatePortalSettingsAction(form);
      if ("success" in r && r.success) toast.success("Portal atualizado");
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
          Portal do cliente
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Aparência padrão do ambiente externo
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do portal</Label>
            <Input
              value={form.portalName}
              onChange={(e) =>
                setForm((f) => ({ ...f, portalName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logo (URL)</Label>
            <Input
              value={form.portalLogoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, portalLogoUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor principal</Label>
            <Input
              type="color"
              value={form.portalColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, portalColor: e.target.value }))
              }
              className="h-10 w-24 p-1"
            />
          </div>
          <div
            className="rounded-xl border border-border p-4"
            style={{ borderTopColor: form.portalColor, borderTopWidth: 3 }}
          >
            <p className="text-sm font-medium" style={{ color: form.portalColor }}>
              {form.portalName || "Portal do Cliente"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Prévia da identidade</p>
          </div>
          <Button disabled={pending} onClick={save}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
