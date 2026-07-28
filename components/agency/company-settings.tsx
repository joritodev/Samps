"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanySettingsAction } from "@/lib/actions/settings.actions";

export type CompanySettingsData = {
  name: string;
  logoUrl: string | null;
  timezone: string;
  language: string;
  dateFormat: string;
  workStartTime: string;
  workEndTime: string;
  workDays: string;
};

export function CompanySettings({ initial }: { initial: CompanySettingsData }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: initial.name,
    logoUrl: initial.logoUrl ?? "",
    timezone: initial.timezone,
    language: initial.language,
    dateFormat: initial.dateFormat,
    workStartTime: initial.workStartTime,
    workEndTime: initial.workEndTime,
    workDays: initial.workDays,
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const r = await updateCompanySettingsAction(form);
      if ("success" in r && r.success) toast.success("Empresa atualizada");
      else toast.error("error" in r ? r.error : "Erro ao salvar");
    });
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Empresa
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Dados da agência e jornada de trabalho
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Logo (URL)</Label>
            <Input
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Input
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Formato de data</Label>
              <Input
                value={form.dateFormat}
                onChange={(e) => set("dateFormat", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias úteis</Label>
              <Input
                value={form.workDays}
                onChange={(e) => set("workDays", e.target.value)}
                placeholder="1,2,3,4,5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                type="time"
                value={form.workStartTime}
                onChange={(e) => set("workStartTime", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                type="time"
                value={form.workEndTime}
                onChange={(e) => set("workEndTime", e.target.value)}
              />
            </div>
          </div>
          <Button disabled={pending} onClick={save}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
